import "server-only";
import { frappeCall } from "./client";

/**
 * Thin reader/writer for HR Settings (Frappe Singleton). Today we only care
 * about `default_performance_framework`; extend this file as more company-wide
 * HR defaults move under /settings.
 */

export type EvaluationFramework = "KRA & Goals" | "OKR" | "Balanced Scorecard";

const FRAMEWORKS: EvaluationFramework[] = [
  "KRA & Goals",
  "OKR",
  "Balanced Scorecard",
];

export function isFramework(v: unknown): v is EvaluationFramework {
  return typeof v === "string" && (FRAMEWORKS as string[]).includes(v);
}

export async function getDefaultPerformanceFramework(): Promise<EvaluationFramework> {
  try {
    const resp = await frappeCall<{ default_performance_framework: string | null }>({
      method: "frappe.client.get_value",
      args: {
        doctype: "HR Settings",
        filters: JSON.stringify({}),
        fieldname: ["default_performance_framework"],
      },
      as: "user",
    });
    const v = resp?.default_performance_framework;
    return isFramework(v) ? v : "KRA & Goals";
  } catch {
    return "KRA & Goals";
  }
}

export async function setDefaultPerformanceFramework(
  framework: EvaluationFramework,
): Promise<void> {
  // HR Settings is a singleton — Frappe accepts `name = "HR Settings"`.
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "HR Settings",
      name: "HR Settings",
      fieldname: { default_performance_framework: framework },
    },
    as: "user",
  });
}

// --- Shift + attendance org-wide toggles --------------------------------

export type ShiftHrSettings = {
  /** When on, every employee check-in captures browser latitude/longitude
   *  and Shift Locations enforce their radius. Off → geofence checks
   *  are skipped, check-ins still record. Mirrors Frappe HR's
   *  `allow_geolocation_tracking` in HR Settings. */
  allowGeolocationTracking: boolean;
  /** When on, the same employee can have overlapping Active Shift
   *  Assignments (multi-role staff, rotating pairs, etc.). Off — Frappe's
   *  default — rejects overlapping saves. Mirrors HR Settings'
   *  `allow_multiple_shift_assignments`. */
  allowMultipleShiftAssignments: boolean;
};

export async function getShiftHrSettings(): Promise<ShiftHrSettings> {
  try {
    const resp = await frappeCall<{
      allow_geolocation_tracking: 0 | 1 | boolean | null;
      allow_multiple_shift_assignments: 0 | 1 | boolean | null;
    }>({
      method: "frappe.client.get_value",
      args: {
        doctype: "HR Settings",
        filters: JSON.stringify({}),
        fieldname: [
          "allow_geolocation_tracking",
          "allow_multiple_shift_assignments",
        ],
      },
      as: "user",
    });
    return {
      allowGeolocationTracking: Boolean(resp?.allow_geolocation_tracking),
      allowMultipleShiftAssignments: Boolean(
        resp?.allow_multiple_shift_assignments,
      ),
    };
  } catch {
    return {
      allowGeolocationTracking: false,
      allowMultipleShiftAssignments: false,
    };
  }
}

export async function setShiftHrSettings(
  input: Partial<ShiftHrSettings>,
): Promise<void> {
  const payload: Record<string, 0 | 1> = {};
  if (input.allowGeolocationTracking !== undefined)
    payload.allow_geolocation_tracking = input.allowGeolocationTracking ? 1 : 0;
  if (input.allowMultipleShiftAssignments !== undefined)
    payload.allow_multiple_shift_assignments = input.allowMultipleShiftAssignments
      ? 1
      : 0;
  if (Object.keys(payload).length === 0) return;
  await frappeCall<unknown>({
    method: "frappe.client.set_value",
    verb: "POST",
    args: {
      doctype: "HR Settings",
      name: "HR Settings",
      fieldname: payload,
    },
    as: "user",
  });
}
