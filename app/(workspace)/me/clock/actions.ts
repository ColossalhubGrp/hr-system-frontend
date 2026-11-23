"use server";

import { revalidatePath } from "next/cache";
import { frappeCall } from "@/lib/frappe/client";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

type CheckinLogType = "IN" | "OUT";

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

type ClockResult = {
  ok: boolean;
  created_id?: string;
  log_type?: CheckinLogType;
  geofence_reason?: "exempt" | "no-locations" | "in-radius";
  blocked_nearest?: string;
  blocked_distance_m?: number;
  blocked_radius_m?: number;
};

/**
 * Record a clock-in or clock-out for the signed-in employee.
 *
 * The whole flow — resolve the caller's own Employee, auto-flip the
 * direction from today's last punch, read the shift's allowed
 * locations, enforce the geofence, and insert the Employee Checkin —
 * runs server-side in recruitment_app.api.self_service.clock, with
 * elevated access scoped to the caller. This works for a plain
 * Employee-role user who has no write permission on Employee Checkin.
 */
export async function clockInOrOutAction(
  _prev: ClockInState,
  form: FormData,
): Promise<ClockInState> {
  const rawLat = form.get("latitude");
  const rawLng = form.get("longitude");
  const explicit = String(form.get("log_type") ?? "");

  let res: ClockResult;
  try {
    res = await frappeCall<ClockResult>({
      method: "recruitment_app.api.self_service.clock",
      verb: "POST",
      args: {
        log_type: explicit === "IN" || explicit === "OUT" ? explicit : undefined,
        latitude: typeof rawLat === "string" && rawLat !== "" ? rawLat : undefined,
        longitude: typeof rawLng === "string" && rawLng !== "" ? rawLng : undefined,
      },
      as: "user",
    });
  } catch (err) {
    return toFormState(err) as ClockInState;
  }

  if (!res.ok) {
    return {
      error:
        `You're outside the allowed clock-in radius. Nearest location: ` +
        `${res.blocked_nearest} (${res.blocked_distance_m} m away, allowed ` +
        `radius ${res.blocked_radius_m} m).`,
      blockedDistanceMeters: res.blocked_distance_m,
      blockedNearestLocation: res.blocked_nearest,
    };
  }

  revalidatePath("/me");
  revalidatePath("/me/clock");
  return {
    createdId: res.created_id,
    logType: res.log_type,
    geofenceReason: res.geofence_reason,
  };
}
