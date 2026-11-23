import "server-only";
import { frappeCall } from "./client";

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
  try {
    type Doc = {
      name?: string;
      employee_name: string | null;
      geofence_exempt: 0 | 1 | boolean | null;
      default_shift: string | null;
    };
    const doc = await frappeCall<Doc>({
      method: "recruitment_app.api.self_service.my_employee",
      as: "user",
    });
    if (!doc?.name) return null;
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
