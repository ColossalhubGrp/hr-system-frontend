"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCurrencyExchange,
  updateCurrencyExchange,
  deleteCurrencyExchange,
} from "@/lib/frappe/multi-currency/currency-exchange";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const schema = z.object({
  date: iso,
  from_currency: z.string().trim().min(1, "From currency is required."),
  to_currency: z.string().trim().min(1, "To currency is required."),
  exchange_rate: z.coerce.number().gt(0, "Rate must be > 0."),
  for_buying: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  for_selling: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
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
    date: data.date,
    fromCurrency: data.from_currency,
    toCurrency: data.to_currency,
    exchangeRate: data.exchange_rate,
    forBuying: data.for_buying,
    forSelling: data.for_selling,
  };
}

export async function createExchangeAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createCurrencyExchange(toInput(parsed.data));
  } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/exchange-rates");
  redirect(`/accounting/multi-currency/exchange-rates/${encodeURIComponent(created.name)}`);
}

export async function updateExchangeAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }
  try { await updateCurrencyExchange(name, toInput(parsed.data)); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/exchange-rates");
  revalidatePath(`/accounting/multi-currency/exchange-rates/${name}`);
  return {};
}

export async function deleteExchangeAction(name: string): Promise<FormState> {
  try { await deleteCurrencyExchange(name); } catch (err) { return toFormState(err); }
  revalidatePath("/accounting/multi-currency/exchange-rates");
  redirect("/accounting/multi-currency/exchange-rates");
}
