"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createBudget,
  updateBudget,
  submitBudget,
  cancelBudget,
  deleteBudget,
  BUDGET_AGAINST,
  ACTIONS,
} from "@/lib/frappe/budgets/budget";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const accountSchema = z.object({ account: z.string().trim().min(1), budget_amount: z.coerce.number().min(0) });
const opt = z.string().trim().optional().transform((v) => v || undefined);
const optAction = z.enum(ACTIONS as unknown as [string, ...string[]]).optional().transform((v) => v ?? "");

const schema = z.object({
  budget_against: z.enum(BUDGET_AGAINST as unknown as [string, ...string[]]),
  company: z.string().trim().min(1, "Company is required."),
  fiscal_year: z.string().trim().min(1, "Fiscal year is required."),
  cost_center: opt,
  project: opt,
  accounting_dimension: opt,
  monthly_distribution: opt,
  applicable_on_material_request: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  applicable_on_purchase_order: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  applicable_on_booking_actual_expenses: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  action_if_annual_budget_exceeded: optAction,
  action_if_annual_budget_exceeded_on_mr: optAction,
  action_if_annual_budget_exceeded_on_po: optAction,
  action_if_accumulated_monthly_budget_exceeded: optAction,
  action_if_accumulated_monthly_budget_exceeded_on_mr: optAction,
  action_if_accumulated_monthly_budget_exceeded_on_po: optAction,
  accounts_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(accountSchema).min(1, "Add at least one account line.")),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

type AccountLine = z.infer<typeof accountSchema>;

function toInput(data: z.infer<typeof schema>) {
  return {
    budgetAgainst: data.budget_against,
    company: data.company,
    fiscalYear: data.fiscal_year,
    costCenter: data.cost_center,
    project: data.project,
    accountingDimension: data.accounting_dimension,
    monthlyDistribution: data.monthly_distribution,
    applicableOnMaterialRequest: data.applicable_on_material_request,
    applicableOnPurchaseOrder: data.applicable_on_purchase_order,
    applicableOnBookingActualExpenses: data.applicable_on_booking_actual_expenses,
    actionIfAnnualBudgetExceeded: data.action_if_annual_budget_exceeded,
    actionIfAnnualBudgetExceededOnMr: data.action_if_annual_budget_exceeded_on_mr,
    actionIfAnnualBudgetExceededOnPo: data.action_if_annual_budget_exceeded_on_po,
    actionIfAccumulatedMonthlyBudgetExceeded: data.action_if_accumulated_monthly_budget_exceeded,
    actionIfAccumulatedMonthlyBudgetExceededOnMr: data.action_if_accumulated_monthly_budget_exceeded_on_mr,
    actionIfAccumulatedMonthlyBudgetExceededOnPo: data.action_if_accumulated_monthly_budget_exceeded_on_po,
    accounts: data.accounts_json.map((a: AccountLine) => ({ account: a.account, budgetAmount: a.budget_amount })),
  };
}

export async function createBudgetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  let created: { name: string };
  try {
    created = await createBudget(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/budgets");
  redirect(`/accounting/budgets/${encodeURIComponent(created.name)}`);
}

export async function updateBudgetAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try {
    await updateBudget(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/budgets");
  revalidatePath(`/accounting/budgets/${name}`);
  return {};
}

export async function submitBudgetAction(name: string): Promise<FormState> {
  try { await submitBudget(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/budgets");
  revalidatePath(`/accounting/budgets/${name}`);
  return {};
}

export async function cancelBudgetAction(name: string): Promise<FormState> {
  try { await cancelBudget(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/budgets");
  revalidatePath(`/accounting/budgets/${name}`);
  return {};
}

export async function deleteBudgetAction(name: string): Promise<FormState> {
  try { await deleteBudget(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/budgets");
  redirect("/accounting/budgets");
}
