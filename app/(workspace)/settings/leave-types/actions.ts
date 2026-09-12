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

const nonNegNumber = z.coerce
  .number({ invalid_type_error: "Enter a number." })
  .min(0, "Can't be negative.")
  .default(0);

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
  // Extended fields from the Frappe HR docs audit.
  is_compensatory: boolCheckbox,
  is_optional_leave: boolCheckbox,
  allow_encashment: boolCheckbox,
  encashment_threshold_days: nonNegNumber,
  earning_component: z.string().trim().optional(),
  allow_negative: boolCheckbox,
  allow_over_allocation: boolCheckbox,
  max_continuous_days_allowed: nonNegNumber,
  is_partially_paid_leave: boolCheckbox,
  fraction_of_daily_salary_per_leave: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .min(0, "Can't be negative.")
    .max(1, "Fraction is between 0 and 1.")
    .default(0),
  allocate_on_day: z.string().trim().optional(),
  earned_leave_frequency: z.string().trim().optional(),
  rounding: z.coerce
    .number({ invalid_type_error: "Enter a number." })
    .min(0, "Can't be negative.")
    .default(0.5),
  expire_carry_forwarded_leaves_after_days: nonNegNumber,
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
    isCompensatory: data.is_compensatory,
    isOptionalLeave: data.is_optional_leave,
    allowEncashment: data.allow_encashment,
    encashmentThresholdDays: data.encashment_threshold_days,
    earningComponent: data.earning_component || null,
    allowNegativeBalance: data.allow_negative,
    allowOverAllocation: data.allow_over_allocation,
    maxContinuousDaysAllowed: data.max_continuous_days_allowed,
    isPartiallyPaidLeave: data.is_partially_paid_leave,
    fractionOfDailySalaryPerLeave: data.fraction_of_daily_salary_per_leave,
    allocateOnDay: data.allocate_on_day || null,
    earnedLeaveFrequency: data.earned_leave_frequency || null,
    rounding: data.rounding,
    expireCarryForwardedLeavesAfterDays: data.expire_carry_forwarded_leaves_after_days,
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
      isCompensatory: parsed.data.is_compensatory,
      isOptionalLeave: parsed.data.is_optional_leave,
      allowEncashment: parsed.data.allow_encashment,
      encashmentThresholdDays: parsed.data.encashment_threshold_days,
      earningComponent: parsed.data.earning_component || undefined,
      allowNegativeBalance: parsed.data.allow_negative,
      allowOverAllocation: parsed.data.allow_over_allocation,
      maxContinuousDaysAllowed: parsed.data.max_continuous_days_allowed,
      isPartiallyPaidLeave: parsed.data.is_partially_paid_leave,
      fractionOfDailySalaryPerLeave: parsed.data.fraction_of_daily_salary_per_leave,
      allocateOnDay: parsed.data.allocate_on_day || undefined,
      earnedLeaveFrequency: parsed.data.earned_leave_frequency || undefined,
      rounding: parsed.data.rounding,
      expireCarryForwardedLeavesAfterDays: parsed.data.expire_carry_forwarded_leaves_after_days,
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
      isCompensatory: parsed.data.is_compensatory,
      isOptionalLeave: parsed.data.is_optional_leave,
      allowEncashment: parsed.data.allow_encashment,
      encashmentThresholdDays: parsed.data.encashment_threshold_days,
      earningComponent: parsed.data.earning_component ?? "",
      allowNegativeBalance: parsed.data.allow_negative,
      allowOverAllocation: parsed.data.allow_over_allocation,
      maxContinuousDaysAllowed: parsed.data.max_continuous_days_allowed,
      isPartiallyPaidLeave: parsed.data.is_partially_paid_leave,
      fractionOfDailySalaryPerLeave: parsed.data.fraction_of_daily_salary_per_leave,
      allocateOnDay: parsed.data.allocate_on_day ?? "",
      earnedLeaveFrequency: parsed.data.earned_leave_frequency ?? "",
      rounding: parsed.data.rounding,
      expireCarryForwardedLeavesAfterDays: parsed.data.expire_carry_forwarded_leaves_after_days,
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

/** Trigger the backend seed for the default Leave Type set. Called
 *  from the empty-state button on the Settings → Leave Types page.
 *  The backend method is idempotent — already-existing types are
 *  skipped, tenant-set values never overwritten. */
export async function seedDefaultLeaveTypesAction(): Promise<
  | {
      ok: true;
      summary: {
        created: string[];
        skipped: string[];
        errors: Array<{ name: string; error: string }>;
      };
    }
  | { ok: false; error: string }
> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    const { frappeCall } = await import("@/lib/frappe/client");
    const summary = await frappeCall<{
      created: string[];
      skipped: string[];
      errors: Array<{ name: string; error: string }>;
    }>({
      method: "recruitment_app.api.me.seed_default_leave_types",
      verb: "POST",
      as: "user",
    });
    revalidatePath("/settings/leave-types");
    return { ok: true, summary };
  } catch (err) {
    const state = toFormState(err);
    return { ok: false, error: state.error ?? "Seed failed." };
  }
}
