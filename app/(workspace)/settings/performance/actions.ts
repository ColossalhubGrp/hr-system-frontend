"use server";

import { revalidatePath } from "next/cache";
import {
  isFramework,
  setDefaultPerformanceFramework,
} from "@/lib/frappe/hr-settings";
import { getMyAccess } from "@/lib/frappe/roles";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type PerformanceSettingsState = StdFormState & { saved?: string };

export async function setDefaultFrameworkAction(
  _prev: PerformanceSettingsState,
  form: FormData,
): Promise<PerformanceSettingsState> {
  const raw = String(form.get("framework") ?? "");
  if (!isFramework(raw)) {
    return { error: "Pick KRA & Goals, OKR, or Balanced Scorecard." };
  }
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    return {
      error:
        "Only HR Director / HR Manager / System Manager / IT Admin can set the default performance framework.",
    };
  }
  try {
    await setDefaultPerformanceFramework(raw);
  } catch (err) {
    return toFormState(err) as PerformanceSettingsState;
  }
  revalidatePath("/settings/performance");
  revalidatePath("/settings");
  // The cycle creation form reads the default, so revalidate that too.
  revalidatePath("/hr/performance/cycles/new");
  return { saved: raw };
}
