"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addLifecycleActivity,
  removeLifecycleActivity,
  setLifecycleActivityCompleted,
  updateLifecycleActivity,
  type LifecycleActivity,
  type ToggleCompletedResult,
} from "@/lib/frappe/lifecycle-activities";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";
import {
  approverErrorMessage,
  resolveApproverUserId,
} from "@/lib/frappe/employee-approvers";

type Parenttype = "Employee Onboarding" | "Employee Separation";
type Kind = "onboarding" | "separation";

const PARENTTYPE: Record<Kind, Parenttype> = {
  onboarding: "Employee Onboarding",
  separation: "Employee Separation",
};

function detailPath(kind: Kind, id: string): string {
  return `/employee/lifecycle/${kind}/${encodeURIComponent(id)}`;
}

/** Turn the value posted from the "Assign to employee" picker (an
 *  Employee id like HR-EMP-00390) into a Frappe user_id (email) —
 *  the child DocType's `user` column is a Link-to-User. Passes plain
 *  emails through unchanged (legacy Activity rows may already carry
 *  one). On failure returns a fieldErrors object the caller can
 *  merge into its state instead of throwing so the picker highlights
 *  correctly. */
async function resolveAssignedUser(
  posted: string | undefined,
): Promise<{ ok: true; userId: string | undefined } | { ok: false; fieldErrors: Record<string, string> }> {
  const raw = (posted ?? "").trim();
  if (!raw) return { ok: true, userId: undefined };
  const res = await resolveApproverUserId(raw);
  if (!res) return { ok: true, userId: undefined };
  if (!res.ok) {
    return {
      ok: false,
      fieldErrors: {
        user: approverErrorMessage(res.reason, "employee", res.detail),
      },
    };
  }
  return { ok: true, userId: res.userId };
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
  const assigned = await resolveAssignedUser(parsed.data.user);
  if (!assigned.ok) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: assigned.fieldErrors,
    };
  }
  try {
    const created = await addLifecycleActivity(parentId, PARENTTYPE[kind], {
      activity_name: parsed.data.activity_name,
      user: assigned.userId,
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

// ---- Update ---------------------------------------------------------------

export type UpdateActivityState = StdFormState & {
  updated?: LifecycleActivity;
};

// Same schema as add — every field is edit-able post-create.
export async function updateActivityAction(
  kind: Kind,
  parentId: string,
  rowName: string,
  _prev: UpdateActivityState,
  form: FormData,
): Promise<UpdateActivityState> {
  const parsed = addSchema.safeParse(formToRecord(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const assigned = await resolveAssignedUser(parsed.data.user);
  if (!assigned.ok) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: assigned.fieldErrors,
    };
  }
  try {
    const updated = await updateLifecycleActivity(
      parentId,
      PARENTTYPE[kind],
      rowName,
      {
        activity_name: parsed.data.activity_name,
        user: assigned.userId,
        role: parsed.data.role || undefined,
        begin_on: parsed.data.begin_on,
        duration: parsed.data.duration,
        required_for_employee_creation: parsed.data.required_for_employee_creation,
        description: parsed.data.description || undefined,
      },
    );
    revalidatePath(detailPath(kind, parentId));
    return { updated };
  } catch (err) {
    return toFormState(err) as UpdateActivityState;
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
