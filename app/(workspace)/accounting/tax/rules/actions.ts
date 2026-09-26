"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
} from "@/lib/frappe/tax/rule";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  tax_type: z.enum(["Sales", "Purchase"]),
  tax_category: opt,
  sales_tax_template: opt,
  purchase_tax_template: opt,
  customer: opt,
  supplier: opt,
  customer_group: opt,
  supplier_group: opt,
  item: opt,
  item_group: opt,
  priority: z.coerce.number().int().min(0).default(1),
  use_for_shopping_cart: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  from_date: opt,
  to_date: opt,
  billing_city: opt,
  billing_state: opt,
  billing_country: opt,
  shipping_city: opt,
  shipping_state: opt,
  shipping_country: opt,
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
    taxType: data.tax_type,
    taxCategory: data.tax_category,
    salesTaxTemplate: data.sales_tax_template,
    purchaseTaxTemplate: data.purchase_tax_template,
    customer: data.customer,
    supplier: data.supplier,
    customerGroup: data.customer_group,
    supplierGroup: data.supplier_group,
    item: data.item,
    itemGroup: data.item_group,
    priority: data.priority,
    useForShoppingCart: data.use_for_shopping_cart,
    fromDate: data.from_date,
    toDate: data.to_date,
    billingCity: data.billing_city,
    billingState: data.billing_state,
    billingCountry: data.billing_country,
    shippingCity: data.shipping_city,
    shippingState: data.shipping_state,
    shippingCountry: data.shipping_country,
  };
}

export async function createTaxRuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createTaxRule(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/rules");
  redirect(`/accounting/tax/rules/${encodeURIComponent(created.name)}`);
}

export async function updateTaxRuleAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateTaxRule(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/rules");
  revalidatePath(`/accounting/tax/rules/${name}`);
  return {};
}

export async function deleteTaxRuleAction(name: string): Promise<FormState> {
  try {
    await deleteTaxRule(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/rules");
  redirect("/accounting/tax/rules");
}
