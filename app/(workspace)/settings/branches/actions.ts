"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBranch } from "@/lib/frappe/branches";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState;

const createSchema = z.object({
  branch: z
    .string()
    .trim()
    .min(1, "Required.")
    .max(140, "Keep it short."),
  weekly_labor_budget: z
    .union([z.coerce.number().nonnegative(), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
});

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

export async function createBranchAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return { error: "Only HR admins can create branches." };
  }
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await createBranch({
      branch: parsed.data.branch,
      weekly_labor_budget: parsed.data.weekly_labor_budget,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/branches");
  return {};
}
