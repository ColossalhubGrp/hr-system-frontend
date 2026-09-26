"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTaxWithholding,
  updateTaxWithholding,
  deleteTaxWithholding,
} from "@/lib/frappe/tax/withholding";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const rateSchema = z.object({
  from_date: iso,
  to_date: iso,
  tax_withholding_rate: z.coerce.number().min(0),
  single_threshold: z.coerce.number().min(0).default(0),
  cumulative_threshold: z.coerce.number().min(0).default(0),
});

const acctSchema = z.object({
  company: z.string().trim().min(1),
  account: z.string().trim().min(1),
});

const schema = z.object({
  category_name: z.string().trim().min(1, "Name is required."),
  round_off_tax_amount: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  consider_party_ledger_amount: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  rates_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(rateSchema)),
  accounts_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(acctSchema)),
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

type WithholdingRate = z.infer<typeof rateSchema>;
type WithholdingAccount = z.infer<typeof acctSchema>;

function toInput(data: z.infer<typeof schema>) {
  return {
    category: data.category_name,
    roundOff: data.round_off_tax_amount,
    considerPartyLedgerAmount: data.consider_party_ledger_amount,
    rates: data.rates_json.map((r: WithholdingRate) => ({
      fromDate: r.from_date,
      toDate: r.to_date,
      taxWithholdingRate: r.tax_withholding_rate,
      singleThreshold: r.single_threshold,
      cumulativeThreshold: r.cumulative_threshold,
    })),
    accounts: data.accounts_json.map((a: WithholdingAccount) => ({ company: a.company, account: a.account })),
  };
}

export async function createTaxWithholdingAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createTaxWithholding(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/withholding");
  redirect(`/accounting/tax/withholding/${encodeURIComponent(created.name)}`);
}

export async function updateTaxWithholdingAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateTaxWithholding(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/withholding");
  revalidatePath(`/accounting/tax/withholding/${name}`);
  return {};
}

export async function deleteTaxWithholdingAction(name: string): Promise<FormState> {
  try {
    await deleteTaxWithholding(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/withholding");
  redirect("/accounting/tax/withholding");
}
