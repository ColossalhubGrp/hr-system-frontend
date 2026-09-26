"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/frappe/sales/customer";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required."),
  customer_type: z.enum(["Company", "Individual"]),
  customer_group: opt,
  territory: opt,
  default_currency: opt,
  tax_id: opt,
  payment_terms: opt,
  default_price_list: opt,
  tax_category: opt,
  language: opt,
  website: opt,
  market_segment: opt,
  industry: opt,
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) return { error: err.message || `Save failed (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

function toInput(data: z.infer<typeof schema>) {
  return {
    customerName: data.customer_name,
    customerType: data.customer_type,
    customerGroup: data.customer_group,
    territory: data.territory,
    defaultCurrency: data.default_currency,
    taxId: data.tax_id,
    paymentTerms: data.payment_terms,
    defaultPriceList: data.default_price_list,
    taxCategory: data.tax_category,
    language: data.language,
    websiteUrl: data.website,
    marketSegment: data.market_segment,
    industry: data.industry,
  };
}

export async function createCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createCustomer(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/sales/customers");
  // Save = done → back to the list, per user preference (matches the
  // Frappe Desk "Save & Close" behaviour).
  redirect("/sales/customers");
}

export async function updateCustomerAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateCustomer(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/sales/customers");
  revalidatePath(`/sales/customers/${name}`);
  redirect("/sales/customers");
}

export async function deleteCustomerAction(name: string): Promise<FormState> {
  try {
    await deleteCustomer(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/sales/customers");
  redirect("/sales/customers");
}
