"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSupplierDirectory,
  updateSupplier,
  deleteSupplier,
} from "@/lib/frappe/buying/supplier";
import { HOLD_TYPES } from "@/lib/frappe/buying/supplier-constants";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };
const opt = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  supplier_name: z.string().trim().min(1, "Supplier name is required."),
  supplier_type: z.enum(["Company", "Individual"]),
  supplier_group: opt,
  country: opt,
  default_currency: opt,
  tax_id: opt,
  payment_terms: opt,
  default_price_list: opt,
  tax_category: opt,
  language: opt,
  website: opt,
  hold_type: z.enum(HOLD_TYPES as unknown as [string, ...string[]]).optional().transform((v) => v ?? ""),
  release_date: opt,
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
    supplierName: data.supplier_name,
    supplierType: data.supplier_type,
    supplierGroup: data.supplier_group,
    country: data.country,
    defaultCurrency: data.default_currency,
    taxId: data.tax_id,
    paymentTerms: data.payment_terms,
    defaultPriceList: data.default_price_list,
    taxCategory: data.tax_category,
    language: data.language,
    websiteUrl: data.website,
    holdType: data.hold_type || undefined,
    releaseDate: data.release_date,
  };
}

export async function createSupplierAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createSupplierDirectory(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/buying/suppliers");
  redirect(`/buying/suppliers/${encodeURIComponent(created.name)}`);
}

export async function updateSupplierAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateSupplier(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/buying/suppliers");
  revalidatePath(`/buying/suppliers/${name}`);
  return {};
}

export async function deleteSupplierAction(name: string): Promise<FormState> {
  try {
    await deleteSupplier(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/buying/suppliers");
  redirect("/buying/suppliers");
}
