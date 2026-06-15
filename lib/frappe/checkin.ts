import "server-only";
import { frappeCall } from "./client";
import { readSession } from "./session";

export type CheckinLogType = "IN" | "OUT";

/**
 * Shape we read from the signed-in user's Employee record for the clock-in
 * flow. Includes the default shift (so we can geofence against its allowed
 * locations) and the geofence exemption HR/Shift Manager set on the profile.
 */
export type ClockInEmployee = {
  id: string;
  name: string;
  geofenceExempt: boolean;
  defaultShift: string | null;
};

/**
 * Resolve the signed-in user to their Employee record. Returns null when no
 * record is linked (e.g. Administrator, or before HR has bound a User to an
 * Employee). Same Frappe-v15 two-step pattern as /me — list-projects only
 * `name`, then fetches the full doc.
 */
export async function getClockInEmployee(): Promise<ClockInEmployee | null> {
  const session = readSession();
  if (!session.userId) return null;
  try {
    type Row = { name: string };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name"],
        filters: JSON.stringify([["user_id", "=", session.userId]]),
        limit_page_length: 1,
      },
      as: "user",
    });
    const id = rows[0]?.name;
    if (!id) return null;
    type Doc = {
      name: string;
      employee_name: string | null;
      geofence_exempt: 0 | 1 | boolean | null;
      default_shift: string | null;
    };
    const doc = await frappeCall<Doc>({
      method: "frappe.client.get",
      args: { doctype: "Employee", name: id },
      as: "user",
    });
    return {
      id: doc.name,
      name: doc.employee_name ?? doc.name,
      geofenceExempt: Boolean(doc.geofence_exempt),
      defaultShift: doc.default_shift,
    };
  } catch {
    return null;
  }
}

export type LastCheckin = {
  id: string;
  logType: CheckinLogType;
  time: string;
  shift: string | null;
};

/** Most recent Employee Checkin for the given employee today. */
export async function getLastCheckinToday(
  employeeId: string,
): Promise<LastCheckin | null> {
  const today = isoToday();
  try {
    type Row = {
      name: string;
      log_type: string;
      time: string;
      shift: string | null;
    };
    const rows = await frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Checkin",
        fields: ["name", "log_type", "time", "shift"],
        filters: JSON.stringify([
          ["employee", "=", employeeId],
          ["time", ">=", `${today} 00:00:00`],
          ["time", "<=", `${today} 23:59:59`],
        ]),
        order_by: "time desc",
        limit_page_length: 1,
      },
      as: "user",
    });
    const r = rows[0];
    if (!r) return null;
    const lt: CheckinLogType = r.log_type === "OUT" ? "OUT" : "IN";
    return { id: r.name, logType: lt, time: r.time, shift: r.shift };
  } catch {
    return null;
  }
}

export type ShiftAllowedLocation = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

/**
 * Read every Shift Location attached to a Shift Type's `allowed_locations`
 * child table. Empty list = no geofence configured = clock-in passes from
 * any coordinate (per the SRS' fail-open spec for unconfigured shifts).
 */
export async function getShiftAllowedLocations(
  shiftType: string,
): Promise<ShiftAllowedLocation[]> {
  try {
    type ShiftDoc = {
      allowed_locations?: Array<{ shift_location?: string | null }> | null;
    };
    const shift = await frappeCall<ShiftDoc>({
      method: "frappe.client.get",
      args: { doctype: "Shift Type", name: shiftType },
      as: "user",
    });
    const ids = (shift.allowed_locations ?? [])
      .map((r) => r.shift_location)
      .filter((s): s is string => Boolean(s));
    if (ids.length === 0) return [];

    // Fetch each Shift Location for its coordinates + radius. Parallel.
    type LocDoc = {
      name: string;
      latitude: number | null;
      longitude: number | null;
      radius_meters: number | null;
      is_active: 0 | 1 | boolean | null;
    };
    const locs = await Promise.all(
      ids.map((id) =>
        frappeCall<LocDoc>({
          method: "frappe.client.get",
          args: { doctype: "Shift Location", name: id },
          as: "user",
        }).catch(() => null),
      ),
    );
    return locs
      .filter((l): l is LocDoc => l !== null && Boolean(l.is_active))
      .map((l) => ({
        name: l.name,
        latitude: Number(l.latitude ?? 0),
        longitude: Number(l.longitude ?? 0),
        radiusMeters: Number(l.radius_meters ?? 0),
      }));
  } catch {
    return [];
  }
}

/** Distance between two lat/lng pairs in metres (Haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeofenceResult =
  | { ok: true; reason: "exempt" | "no-locations" | "in-radius"; location?: string }
  | { ok: false; nearest: string; distanceMeters: number; radiusMeters: number };

/**
 * Decide if a clock-in coordinate passes geofence. Fail-open in three cases:
 * employee is exempt, shift has no allowed locations, or no shift is linked.
 * Otherwise the coordinate must sit within at least one location's radius.
 */
export function evaluateGeofence(args: {
  exempt: boolean;
  lat: number;
  lng: number;
  allowed: ShiftAllowedLocation[];
}): GeofenceResult {
  if (args.exempt) return { ok: true, reason: "exempt" };
  if (args.allowed.length === 0)
    return { ok: true, reason: "no-locations" };
  let nearest = args.allowed[0]!;
  let nearestDist = haversineMeters(
    args.lat,
    args.lng,
    nearest.latitude,
    nearest.longitude,
  );
  for (const loc of args.allowed) {
    const d = haversineMeters(args.lat, args.lng, loc.latitude, loc.longitude);
    if (d <= loc.radiusMeters)
      return { ok: true, reason: "in-radius", location: loc.name };
    if (d < nearestDist) {
      nearest = loc;
      nearestDist = d;
    }
  }
  return {
    ok: false,
    nearest: nearest.name,
    distanceMeters: nearestDist,
    radiusMeters: nearest.radiusMeters,
  };
}

/** Insert an Employee Checkin row as the signed-in user. */
export async function createEmployeeCheckin(args: {
  employee: string;
  logType: CheckinLogType;
  latitude?: number;
  longitude?: number;
  shift?: string;
}): Promise<string> {
  const doc: Record<string, unknown> = {
    doctype: "Employee Checkin",
    employee: args.employee,
    log_type: args.logType,
    time: nowSql(),
  };
  if (args.latitude !== undefined) doc.latitude = args.latitude;
  if (args.longitude !== undefined) doc.longitude = args.longitude;
  if (args.shift) doc.shift = args.shift;
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    args: { doc },
    verb: "POST",
    as: "user",
  });
  return saved.name;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowSql(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
