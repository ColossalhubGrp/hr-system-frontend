"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createRevaluation,
  fetchRevaluationBalances,
  submitRevaluation,
  cancelRevaluation,
  deleteRevaluation,
} from "@/lib/frappe/multi-currency/revaluation";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const schema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  posting_date: iso,
  gain_loss_account: z.string().trim().min(1, "Gain/loss account is required."),
  rounding_loss_allowance: z.coerce.number().min(0).default(0.05),
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

export async function createRevaluationAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createRevaluation({
      company: parsed.data.company,
      postingDate: parsed.data.posting_date,
      gainLossAccount: parsed.data.gain_loss_account,
      roundingLossAllowance: parsed.data.rounding_loss_allowance,
    });
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/revaluation");
  redirect(`/accounting/multi-currency/revaluation/${encodeURIComponent(created.name)}`);
}

export async function fetchBalancesAction(name: string): Promise<FormState> {
  try { await fetchRevaluationBalances(name); } catch (err) { return toFormState(err); }
  revalidatePath(`/accounting/multi-currency/revaluation/${name}`);
  return {};
}

export async function submitRevaluationAction(name: string): Promise<FormState> {
  try { await submitRevaluation(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/revaluation");
  revalidatePath(`/accounting/multi-currency/revaluation/${name}`);
  return {};
}

export async function cancelRevaluationAction(name: string): Promise<FormState> {
  try { await cancelRevaluation(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/revaluation");
  revalidatePath(`/accounting/multi-currency/revaluation/${name}`);
  return {};
}

export async function deleteRevaluationAction(name: string): Promise<FormState> {
  try { await deleteRevaluation(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/revaluation");
  redirect("/accounting/multi-currency/revaluation");
}
