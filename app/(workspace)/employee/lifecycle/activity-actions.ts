"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addLifecycleActivity,
  removeLifecycleActivity,
  setLifecycleActivityCompleted,
  type LifecycleActivity,
  type ToggleCompletedResult,
} from "@/lib/frappe/lifecycle-activities";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

type Parenttype = "Employee Onboarding" | "Employee Separation";
type Kind = "onboarding" | "separation";

const PARENTTYPE: Record<Kind, Parenttype> = {
  onboarding: "Employee Onboarding",
  separation: "Employee Separation",
};

function detailPath(kind: Kind, id: string): string {
  return `/employee/lifecycle/${kind}/${encodeURIComponent(id)}`;
}

// ---- Add ------------------------------------------------------------------

export type AddActivityState = StdFormState & {
  created?: LifecycleActivity;
};

const addSchema = z.object({
  activity_name: z.string().trim().min(1, "Required."),
  user: z.string().trim().optional(),
  role: z.string().trim().optional(),
  begin_on: z
    .union([z.coerce.number().int(), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  duration: z
    .union([z.coerce.number().int().nonnegative(), z.literal("")])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  required_for_employee_creation: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => (v === "on" ? 1 : 0) as 0 | 1),
  description: z.string().trim().optional(),
});

export async function addActivityAction(
  kind: Kind,
  parentId: string,
  _prev: AddActivityState,
  form: FormData,
): Promise<AddActivityState> {
  const parsed = addSchema.safeParse(formToRecord(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  try {
    const created = await addLifecycleActivity(parentId, PARENTTYPE[kind], {
      activity_name: parsed.data.activity_name,
      user: parsed.data.user || undefined,
      role: parsed.data.role || undefined,
      begin_on: parsed.data.begin_on,
      duration: parsed.data.duration,
      required_for_employee_creation: parsed.data.required_for_employee_creation,
      description: parsed.data.description || undefined,
    });
    revalidatePath(detailPath(kind, parentId));
    return { created };
  } catch (err) {
    return toFormState(err) as AddActivityState;
  }
}

// ---- Remove ---------------------------------------------------------------

export type RemoveActivityResult = { ok: true } | { ok: false; error: string };

export async function removeActivityAction(
  kind: Kind,
  parentId: string,
  rowName: string,
): Promise<RemoveActivityResult> {
  try {
    await removeLifecycleActivity(parentId, PARENTTYPE[kind], rowName);
    revalidatePath(detailPath(kind, parentId));
    return { ok: true };
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to remove." };
  }
}

// ---- Toggle completed -----------------------------------------------------

export type ToggleActivityResult =
  | { ok: true; result: ToggleCompletedResult }
  | { ok: false; error: string };

export async function toggleActivityCompletedAction(
  kind: Kind,
  parentId: string,
  rowName: string,
  completed: boolean,
): Promise<ToggleActivityResult> {
  try {
    const result = await setLifecycleActivityCompleted(
      parentId,
      PARENTTYPE[kind],
      rowName,
      completed,
    );
    revalidatePath(detailPath(kind, parentId));
    return { ok: true, result };
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to update." };
  }
}
