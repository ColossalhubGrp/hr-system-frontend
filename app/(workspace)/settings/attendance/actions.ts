"use server";

import { revalidatePath } from "next/cache";
import { setShiftHrSettings } from "@/lib/frappe/hr-settings";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export async function saveAttendanceSettingsAction(
  _prev: StdFormState,
  form: FormData,
): Promise<StdFormState> {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    return { error: "Only HR admins can change these settings." };
  }
  try {
    await setShiftHrSettings({
      allowGeolocationTracking: form.get("allow_geolocation_tracking") === "on",
      allowMultipleShiftAssignments:
        form.get("allow_multiple_shift_assignments") === "on",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/attendance");
  return { success: true } as StdFormState & { success?: boolean };
}
