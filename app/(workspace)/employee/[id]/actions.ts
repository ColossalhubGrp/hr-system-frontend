"use server";

import { revalidatePath } from "next/cache";
import { frappeCall } from "@/lib/frappe/client";
import { setEmployeeGeofenceExempt } from "@/lib/frappe/employee-write";
import { getMyAccess } from "@/lib/frappe/roles";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type GeofenceExemptState = StdFormState & { saved?: boolean };

/**
 * Toggle `Employee.geofence_exempt` — HR/Shift Admin only. Frappe perms
 * already restrict who can write the field, but we also reject non-admin
 * callers here so the user sees a clear message instead of a generic 403.
 *
 * The form submits a `value` field: `"on"` to enable exemption, anything else
 * to disable. Matches the standard HTML checkbox behaviour.
 */
export async function setEmployeeGeofenceExemptAction(
  employeeId: string,
  _prev: GeofenceExemptState,
  form: FormData,
): Promise<GeofenceExemptState> {
  const exempt = String(form.get("value") ?? "") === "on";

  const access = await getMyAccess();
  if (!access.isShiftAdmin) {
    return {
      error:
        "Only HR Manager, HR User, or System Manager roles can change this employee's geofence policy.",
    };
  }
  try {
    await setEmployeeGeofenceExempt(employeeId, exempt);
  } catch (err) {
    return toFormState(err) as GeofenceExemptState;
  }
  revalidatePath(`/employee/${encodeURIComponent(employeeId)}`);
  return { saved: exempt };
}

// ---------------------------------------------------------------------------
// Convert to Alumni
// ---------------------------------------------------------------------------

export type ConvertToAlumniState = StdFormState & {
  saved?: {
    user: string | null;
    rolesBefore: string[];
    rolesAfter: string[];
    statusChanged: boolean;
  };
};

type ConvertResp = {
  ok: boolean;
  employee: string;
  fields_changed: Record<string, string>;
  roles: {
    user: string | null;
    before: string[];
    after: string[];
  };
};

/**
 * Convert an active employee to Alumni on exit. Strips every active workforce
 * role from the linked User, assigns the Alumni role, and sets the Employee
 * status to "Left" plus a relieving date.
 *
 * Defense in depth:
 *   - This Server Action checks HR_ADMIN or IT_ADMIN at the Next.js layer
 *   - The whitelisted Frappe method re-checks the same role set server-side
 *   - The caller cannot convert their OWN account (anti-self-lockout)
 *
 * Form submits a `relieving_date` field (YYYY-MM-DD). Empty defaults to today.
 */
export async function convertToAlumniAction(
  employeeId: string,
  _prev: ConvertToAlumniState,
  form: FormData,
): Promise<ConvertToAlumniState> {
  const relievingDate = String(form.get("relieving_date") ?? "").trim();
  // Belt-and-braces date validation — Frappe will also reject malformed dates,
  // but we'd rather not even round-trip when we can catch it here.
  if (relievingDate && !/^\d{4}-\d{2}-\d{2}$/.test(relievingDate)) {
    return { error: "Relieving date must be YYYY-MM-DD." };
  }

  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return {
      error:
        "Only HR Director / HR Manager / IT Admin can convert an employee to Alumni.",
    };
  }

  try {
    const resp = await frappeCall<ConvertResp>({
      method: "recruitment_app.api.me.convert_to_alumni",
      verb: "POST",
      args: {
        employee_id: employeeId,
        relieving_date: relievingDate || undefined,
      },
      as: "user",
    });
    revalidatePath(`/employee/${encodeURIComponent(employeeId)}`);
    revalidatePath("/employee");
    return {
      saved: {
        user: resp.roles.user,
        rolesBefore: resp.roles.before,
        rolesAfter: resp.roles.after,
        statusChanged: Object.keys(resp.fields_changed).length > 0,
      },
    };
  } catch (err) {
    return toFormState(err) as ConvertToAlumniState;
  }
}
