"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCompanyMaster,
  updateCompanyMaster,
  deleteCompanyMaster,
} from "@/lib/frappe/masters/company";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const createSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required."),
  abbr: z.string().trim().min(1, "Abbreviation is required."),
  default_currency: z.string().trim().min(1, "Default currency is required."),
  country: z.string().trim().min(1, "Country is required."),
  chart_of_accounts: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  domain: z.string().trim().optional(),
});

const nullable = z.string().trim().optional().transform((v) => (v ? v : null));

const editSchema = z.object({
  tax_id: nullable,
  domain: nullable,
  default_holiday_list: nullable,
  cost_center: nullable,
  round_off_account: nullable,
  round_off_cost_center: nullable,
  write_off_account: nullable,
  default_bank_account: nullable,
  default_cash_account: nullable,
  default_receivable_account: nullable,
  default_payable_account: nullable,
  default_income_account: nullable,
  default_expense_account: nullable,
  exchange_gain_loss_account: nullable,
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => (v === "on" ? 1 : 0)),
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

export async function createCompanyMasterAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
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
    created = await createCompanyMaster({
      companyName: parsed.data.company_name,
      abbr: parsed.data.abbr,
      defaultCurrency: parsed.data.default_currency,
      country: parsed.data.country,
      chartOfAccounts: parsed.data.chart_of_accounts,
      taxId: parsed.data.tax_id,
      domain: parsed.data.domain,
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/companies");
  redirect(`/accounting/masters/companies/${encodeURIComponent(created.name)}`);
}

export async function updateCompanyMasterAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  }
  try {
    await updateCompanyMaster(name, parsed.data as Record<string, unknown>);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/companies");
  revalidatePath(`/accounting/masters/companies/${name}`);
  return {};
}

export async function deleteCompanyMasterAction(name: string): Promise<FormState> {
  try {
    await deleteCompanyMaster(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/companies");
  redirect("/accounting/masters/companies");
}
