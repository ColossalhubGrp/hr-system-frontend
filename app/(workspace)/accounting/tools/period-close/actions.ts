"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPeriodClosing,
  submitPeriodClosing,
  cancelPeriodClosing,
  deletePeriodClosing,
} from "@/lib/frappe/tools/period-closing-voucher";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  fiscal_year: z.string().trim().min(1, "Fiscal year is required."),
  posting_date: iso,
  closing_account_head: z.string().trim().min(1, "Closing account is required."),
  cost_center: opt,
  finance_book: opt,
  remarks: opt,
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

export async function createPeriodClosingAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createPeriodClosing({
      company: parsed.data.company,
      fiscalYear: parsed.data.fiscal_year,
      postingDate: parsed.data.posting_date,
      closingAccountHead: parsed.data.closing_account_head,
      costCenter: parsed.data.cost_center,
      financeBook: parsed.data.finance_book,
      remarks: parsed.data.remarks,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/tools/period-close");
  redirect(`/accounting/tools/period-close/${encodeURIComponent(created.name)}`);
}

export async function submitPeriodClosingAction(name: string): Promise<FormState> {
  try { await submitPeriodClosing(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/tools/period-close");
  revalidatePath(`/accounting/tools/period-close/${name}`);
  return {};
}

export async function cancelPeriodClosingAction(name: string): Promise<FormState> {
  try { await cancelPeriodClosing(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/tools/period-close");
  revalidatePath(`/accounting/tools/period-close/${name}`);
  return {};
}

export async function deletePeriodClosingAction(name: string): Promise<FormState> {
  try { await deletePeriodClosing(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/tools/period-close");
  redirect("/accounting/tools/period-close");
}
