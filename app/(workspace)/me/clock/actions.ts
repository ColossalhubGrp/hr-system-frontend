"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployeeCheckin,
  evaluateGeofence,
  getClockInEmployee,
  getLastCheckinToday,
  getShiftAllowedLocations,
  type CheckinLogType,
} from "@/lib/frappe/checkin";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type ClockInState = StdFormState & {
  /** Created Employee Checkin id when successful. */
  createdId?: string;
  /** Direction we recorded (auto-flipped from the last checkin if user didn't
   *  specify). */
  logType?: CheckinLogType;
  /** Human-readable reason the geofence allowed the punch. */
  geofenceReason?: "exempt" | "no-locations" | "in-radius";
  /** Distance from the nearest allowed location when geofence FAILED. */
  blockedDistanceMeters?: number;
  /** Nearest location name when geofence FAILED. */
  blockedNearestLocation?: string;
};

/**
 * Record a clock-in or clock-out for the signed-in employee.
 *
 * Flow:
 *  1. Resolve the signed-in user's Employee record. If none, reject.
 *  2. Pick the direction: form `log_type` wins; else auto-flip from the last
 *     checkin today (default IN if there's no prior).
 *  3. Read the employee's default shift and its allowed locations.
 *  4. If `geofence_exempt` is true on the Employee, skip enforcement.
 *  5. Otherwise: require coords + a shift with at least one allowed location;
 *     check that the coord falls within at least one location's radius.
 *  6. Insert the Employee Checkin row and revalidate `/me`.
 */
export async function clockInOrOutAction(
  _prev: ClockInState,
  form: FormData,
): Promise<ClockInState> {
  const emp = await getClockInEmployee();
  if (!emp) {
    return {
      error:
        "Your user isn't linked to an Employee record yet. Ask HR to set the User on your Employee profile.",
    };
  }

  const rawLat = form.get("latitude");
  const rawLng = form.get("longitude");
  const lat = typeof rawLat === "string" && rawLat !== "" ? Number(rawLat) : null;
  const lng = typeof rawLng === "string" && rawLng !== "" ? Number(rawLng) : null;

  // Direction: explicit > auto-flip > default IN.
  const explicit = String(form.get("log_type") ?? "");
  const last = await getLastCheckinToday(emp.id);
  const logType: CheckinLogType =
    explicit === "IN" || explicit === "OUT"
      ? explicit
      : last?.logType === "IN"
        ? "OUT"
        : "IN";

  // Geofence — only when the employee isn't exempt and we have a shift.
  const allowed = emp.defaultShift
    ? await getShiftAllowedLocations(emp.defaultShift)
    : [];
  const geofence = evaluateGeofence({
    exempt: emp.geofenceExempt,
    lat: lat ?? 0,
    lng: lng ?? 0,
    allowed,
  });
  if (!geofence.ok) {
    return {
      error: `You're outside the allowed clock-in radius. Nearest location: ${geofence.nearest} (${Math.round(
        geofence.distanceMeters,
      )} m away, allowed radius ${geofence.radiusMeters} m).`,
      blockedDistanceMeters: geofence.distanceMeters,
      blockedNearestLocation: geofence.nearest,
    };
  }

  try {
    const id = await createEmployeeCheckin({
      employee: emp.id,
      logType,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
      shift: emp.defaultShift ?? undefined,
    });
    revalidatePath("/me");
    revalidatePath("/me/clock");
    return {
      createdId: id,
      logType,
      geofenceReason:
        geofence.reason === "exempt"
          ? "exempt"
          : geofence.reason === "no-locations"
            ? "no-locations"
            : "in-radius",
    };
  } catch (err) {
    return toFormState(err) as ClockInState;
  }
}
