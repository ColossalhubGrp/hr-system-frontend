"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/lib/frappe/banking/bank-account";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  account_name: z.string().trim().min(1, "Account name is required."),
  bank: z.string().trim().min(1, "Bank is required."),
  account_type: opt,
  is_default: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  is_company_account: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  bank_account_no: opt,
  iban: opt,
  company: opt,
  account: opt,
  currency: opt,
  party_type: opt,
  party: opt,
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

function toInput(data: z.infer<typeof schema>) {
  return {
    accountName: data.account_name,
    bank: data.bank,
    accountType: data.account_type,
    isDefault: data.is_default,
    isCompanyAccount: data.is_company_account,
    disabled: data.disabled,
    bankAccountNo: data.bank_account_no,
    iban: data.iban,
    company: data.company,
    account: data.account,
    currency: data.currency,
    partyType: data.party_type,
    party: data.party,
  };
}

export async function createBankAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createBankAccount(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/accounts");
  redirect(`/accounting/banking/accounts/${encodeURIComponent(created.name)}`);
}

export async function updateBankAccountAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateBankAccount(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/accounts");
  revalidatePath(`/accounting/banking/accounts/${name}`);
  return {};
}

export async function deleteBankAccountAction(name: string): Promise<FormState> {
  try { await deleteBankAccount(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/accounts");
  redirect("/accounting/banking/accounts");
}
