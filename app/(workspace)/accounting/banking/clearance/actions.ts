"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createBankClearance,
  loadClearancePayments,
  saveClearanceDates,
  submitBankClearance,
  deleteBankClearance,
} from "@/lib/frappe/banking/bank-clearance";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const opt = z.string().trim().optional().transform((v) => v || undefined);

const createSchema = z.object({
  account: z.string().trim().min(1, "GL account is required."),
  from_date: iso,
  to_date: iso,
  bank_account: opt,
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

export async function createClearanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createBankClearance({
      account: parsed.data.account,
      fromDate: parsed.data.from_date,
      toDate: parsed.data.to_date,
      bankAccount: parsed.data.bank_account,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/clearance");
  redirect(`/accounting/banking/clearance/${encodeURIComponent(created.name)}`);
}

export async function loadPaymentsAction(name: string): Promise<FormState> {
  try { await loadClearancePayments(name); } catch (err) { return toFormState(err); }
  revalidatePath(`/accounting/banking/clearance/${name}`);
  return {};
}

export async function saveDatesAction(name: string, rows: Array<{ idx: number; clearanceDate: string | null }>): Promise<FormState> {
  try { await saveClearanceDates(name, rows); } catch (err) { return toFormState(err); }
  revalidatePath(`/accounting/banking/clearance/${name}`);
  return {};
}

export async function submitClearanceAction(name: string): Promise<FormState> {
  try { await submitBankClearance(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/clearance");
  revalidatePath(`/accounting/banking/clearance/${name}`);
  return {};
}

export async function deleteClearanceAction(name: string): Promise<FormState> {
  try { await deleteBankClearance(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/banking/clearance");
  redirect("/accounting/banking/clearance");
}
