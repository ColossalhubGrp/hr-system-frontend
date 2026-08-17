"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createLeaveType,
  deleteLeaveType,
  updateLeaveType,
  type LeaveTypeRow,
} from "@/lib/frappe/leave-types";
import { getMyAccess } from "@/lib/frappe/roles";
import {
  formToRecord,
  toFormState,
  type StdFormState,
} from "@/lib/frappe/form-errors";

export type FormState = StdFormState & {
  created?: LeaveTypeRow;
  updated?: LeaveTypeRow;
  /** For update: the name BEFORE the rename so the client can splice
   *  the right row when the label changed. */
  originalName?: string;
};

const nameSchema = z
  .string()
  .trim()
  .min(1, "Required.")
  .max(140, "Keep it short.")
  .refine(
    (v) => !v.includes("/"),
    "Slashes aren't allowed in the name — Frappe uses them internally.",
  );

const boolCheckbox = z
  .union([z.literal("on"), z.literal("off"), z.literal(""), z.undefined()])
  .transform((v) => v === "on");

const baseFields = {
  name: nameSchema,
  max_leaves_allowed: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .min(0, "Can't be negative.")
    .max(365, "Cap at 365 days per year."),
  is_earned_leave: boolCheckbox,
  is_carry_forward: boolCheckbox,
  is_lwp: boolCheckbox,
  include_holiday: boolCheckbox,
  applicable_after: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .min(0, "Can't be negative.")
    .max(3650, "Cap at 3650 days.")
    .default(0),
  description: z.string().trim().optional(),
};

const createSchema = z.object(baseFields);
const updateSchema = z.object({
  ...baseFields,
  original_name: z.string().trim().min(1),
});

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

async function requireHrAdmin(): Promise<string | null> {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    return "Only HR admins can manage leave types.";
  }
  return null;
}

function toRow(name: string, data: z.infer<typeof createSchema>): LeaveTypeRow {
  return {
    name,
    maxLeavesAllowed: data.max_leaves_allowed,
    isEarnedLeave: data.is_earned_leave,
    isCarryForward: data.is_carry_forward,
    isLwp: data.is_lwp,
    includeHoliday: data.include_holiday,
    applicableAfter: data.applicable_after,
    description: data.description || null,
  };
}

export async function createLeaveTypeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = createSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let savedName: string;
  try {
    savedName = await createLeaveType({
      name: parsed.data.name,
      maxLeavesAllowed: parsed.data.max_leaves_allowed,
      isEarnedLeave: parsed.data.is_earned_leave,
      isCarryForward: parsed.data.is_carry_forward,
      isLwp: parsed.data.is_lwp,
      includeHoliday: parsed.data.include_holiday,
      applicableAfter: parsed.data.applicable_after,
      description: parsed.data.description || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/leave-types");
  return { created: toRow(savedName, parsed.data) };
}

export async function updateLeaveTypeAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = updateSchema.safeParse(formToRecord(form));
  if (!parsed.success) return fieldErrors(parsed);
  let finalName: string;
  try {
    finalName = await updateLeaveType(parsed.data.original_name, {
      name: parsed.data.name,
      maxLeavesAllowed: parsed.data.max_leaves_allowed,
      isEarnedLeave: parsed.data.is_earned_leave,
      isCarryForward: parsed.data.is_carry_forward,
      isLwp: parsed.data.is_lwp,
      includeHoliday: parsed.data.include_holiday,
      applicableAfter: parsed.data.applicable_after,
      description: parsed.data.description ?? "",
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/settings/leave-types");
  return {
    updated: toRow(finalName, parsed.data),
    originalName: parsed.data.original_name,
  };
}

export async function deleteLeaveTypeAction(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteLeaveType(name);
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Failed to delete." };
  }
  revalidatePath("/settings/leave-types");
  return { ok: true };
}
