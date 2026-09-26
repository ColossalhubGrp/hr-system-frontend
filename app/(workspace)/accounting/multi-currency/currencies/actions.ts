"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCurrency,
  updateCurrency,
  deleteCurrency,
} from "@/lib/frappe/multi-currency/currency";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  currency_name: z.string().trim().min(1, "Name is required."),
  symbol: opt,
  fraction: opt,
  fraction_units: z.coerce.number().int().min(0).default(100),
  smallest_currency_fraction_value: z.coerce.number().min(0).default(0.01),
  number_format: opt,
  enabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
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
    currencyName: data.currency_name,
    symbol: data.symbol,
    fraction: data.fraction,
    fractionUnits: data.fraction_units,
    smallestCurrencyFractionValue: data.smallest_currency_fraction_value,
    numberFormat: data.number_format,
    enabled: data.enabled,
  };
}

export async function createCurrencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createCurrency(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/currencies");
  redirect(`/accounting/multi-currency/currencies/${encodeURIComponent(created.name)}`);
}

export async function updateCurrencyAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateCurrency(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/currencies");
  revalidatePath(`/accounting/multi-currency/currencies/${name}`);
  return {};
}

export async function deleteCurrencyAction(name: string): Promise<FormState> {
  try { await deleteCurrency(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/currencies");
  redirect("/accounting/multi-currency/currencies");
}
