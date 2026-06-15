"use server";

import { revalidatePath } from "next/cache";
import {
  setAppraisalPotential,
  type Band,
} from "@/lib/frappe/calibration";
import { getMyAccess } from "@/lib/frappe/roles";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";

export type CalibrationState = StdFormState & { saved?: Band };

const VALID: Band[] = ["Low", "Medium", "High"];
function isBand(s: string): s is Band {
  return (VALID as string[]).includes(s);
}

/**
 * Recalibrate an Appraisal's potential rating. HR_ADMIN only — calibration
 * is a leadership exercise, not a line-manager one. Frappe still re-checks
 * the underlying Appraisal write via DocPerm.
 */
export async function recalibrateAction(
  appraisalId: string,
  _prev: CalibrationState,
  form: FormData,
): Promise<CalibrationState> {
  const raw = String(form.get("potential") ?? "");
  if (!isBand(raw)) {
    return { error: "Pick Low, Medium, or High." };
  }
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    return {
      error: "Only HR Director / HR Manager / IT Admin can recalibrate.",
    };
  }
  try {
    await setAppraisalPotential(appraisalId, raw);
  } catch (err) {
    return toFormState(err) as CalibrationState;
  }
  revalidatePath("/hr/performance/calibration");
  return { saved: raw };
}
