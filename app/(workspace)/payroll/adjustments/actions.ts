"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAdjustment,
  createAdditionalSalary,
  createEmployeeIncentive,
  createRetentionBonus,
  submitAdjustment,
  type AdjustmentDoctype,
} from "@/lib/frappe/pay-adjustments";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type FormState = StdFormState;

async function requireHrAdmin(): Promise<string | null> {
  const a = await getMyAccess();
  if (!a.isHrAdmin && !a.isItAdmin) return "Only HR admins can manage pay adjustments.";
  return null;
}

function fieldErrors(parsed: z.SafeParseError<unknown>): FormState {
  const out: Record<string, string> = {};
  for (const i of parsed.error.issues) {
    const k = String(i.path[0] ?? "");
    if (k && !out[k]) out[k] = i.message;
  }
  return { error: "Check the highlighted fields.", fieldErrors: out };
}

// ── Additional Salary ─────────────────────────────────────────────────────

const additionalSalarySchema = z
  .object({
    employee: z.string().trim().min(1, "Pick an employee."),
    salary_component: z.string().trim().min(1, "Pick a salary component."),
    amount: z.coerce.number().positive("Amount must be positive."),
    payroll_date: z.string().trim().min(1, "Pick a payroll date."),
    is_recurring: z
      .union([z.literal("on"), z.literal("off"), z.literal(""), z.undefined()])
      .transform((v) => v === "on"),
    from_date: z.string().trim().optional(),
    to_date: z.string().trim().optional(),
    currency: z.string().trim().optional(),
    overwrite: z
      .union([z.literal("on"), z.literal("off"), z.literal(""), z.undefined()])
      .transform((v) => v === "on"),
    deduct_full_tax: z
      .union([z.literal("on"), z.literal("off"), z.literal(""), z.undefined()])
      .transform((v) => v === "on"),
    company: z.string().trim().optional(),
  })
  .refine((d) => !d.is_recurring || (d.from_date && d.to_date), {
    message: "Recurring adjustments need a From and To date.",
    path: ["from_date"],
  });

export async function createAdditionalSalaryAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = additionalSalarySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed);
  let id: string;
  try {
    id = await createAdditionalSalary({
      employee: parsed.data.employee,
      salaryComponent: parsed.data.salary_component,
      amount: parsed.data.amount,
      payrollDate: parsed.data.payroll_date,
      isRecurring: parsed.data.is_recurring,
      fromDate: parsed.data.from_date || undefined,
      toDate: parsed.data.to_date || undefined,
      currency: parsed.data.currency || undefined,
      overwriteSalaryStructureAmount: parsed.data.overwrite,
      deductFullTaxOnSelectedPayrollDate: parsed.data.deduct_full_tax,
      company: parsed.data.company || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/adjustments");
  redirect(`/payroll/adjustments?tab=additional`);
}

// ── Retention Bonus ────────────────────────────────────────────────────────

const retentionSchema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  salary_component: z.string().trim().min(1, "Pick a salary component."),
  bonus_amount: z.coerce.number().positive("Amount must be positive."),
  bonus_payment_date: z.string().trim().min(1, "Pick a payment date."),
  company: z.string().trim().optional(),
});

export async function createRetentionBonusAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = retentionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await createRetentionBonus({
      employee: parsed.data.employee,
      bonusPaymentDate: parsed.data.bonus_payment_date,
      bonusAmount: parsed.data.bonus_amount,
      salaryComponent: parsed.data.salary_component,
      company: parsed.data.company || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/adjustments");
  redirect(`/payroll/adjustments?tab=retention`);
}

// ── Employee Incentive ─────────────────────────────────────────────────────

const incentiveSchema = z.object({
  employee: z.string().trim().min(1, "Pick an employee."),
  salary_component: z.string().trim().min(1, "Pick a salary component."),
  incentive_amount: z.coerce.number().positive("Amount must be positive."),
  payroll_date: z.string().trim().min(1, "Pick a payroll date."),
  company: z.string().trim().optional(),
});

export async function createIncentiveAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const blocked = await requireHrAdmin();
  if (blocked) return { error: blocked };
  const parsed = incentiveSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed);
  try {
    await createEmployeeIncentive({
      employee: parsed.data.employee,
      incentiveAmount: parsed.data.incentive_amount,
      payrollDate: parsed.data.payroll_date,
      salaryComponent: parsed.data.salary_component,
      company: parsed.data.company || undefined,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/payroll/adjustments");
  redirect(`/payroll/adjustments?tab=incentive`);
}

// ── Submit / cancel ────────────────────────────────────────────────────────

export async function submitAdjustmentAction(
  doctype: AdjustmentDoctype,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await submitAdjustment(doctype, name);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to submit." };
  }
  revalidatePath("/payroll/adjustments");
  return { ok: true };
}

export async function cancelAdjustmentAction(
  doctype: AdjustmentDoctype,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blocked = await requireHrAdmin();
  if (blocked) return { ok: false, error: blocked };
  try {
    await cancelAdjustment(doctype, name);
  } catch (err) {
    return { ok: false, error: toFormState(err).error ?? "Failed to cancel." };
  }
  revalidatePath("/payroll/adjustments");
  return { ok: true };
}
