"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPurchaseTaxTemplate,
  updatePurchaseTaxTemplate,
  deletePurchaseTaxTemplate,
  CHARGE_TYPES,
  CATEGORY,
  ADD_DEDUCT,
} from "@/lib/frappe/tax/purchase-template";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const lineSchema = z.object({
  charge_type: z.enum(CHARGE_TYPES as unknown as [string, ...string[]]),
  account_head: z.string().trim().min(1),
  description: z.string().trim().min(1),
  rate: z.coerce.number(),
  category: z.enum(CATEGORY as unknown as [string, ...string[]]),
  add_deduct_tax: z.enum(ADD_DEDUCT as unknown as [string, ...string[]]),
  cost_center: z.string().trim().optional(),
  included_in_print_rate: z.boolean().optional().default(false),
});

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  company: z.string().trim().min(1, "Company is required."),
  is_default: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  taxes_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(lineSchema).min(1, "Add at least one tax line.")),
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

type Line = z.infer<typeof lineSchema>;

function toInput(data: z.infer<typeof schema>) {
  return {
    title: data.title,
    company: data.company,
    isDefault: data.is_default,
    disabled: data.disabled,
    taxes: data.taxes_json.map((t: Line) => ({
      chargeType: t.charge_type,
      accountHead: t.account_head,
      description: t.description,
      rate: t.rate,
      category: t.category,
      addDeductTax: t.add_deduct_tax,
      costCenter: t.cost_center,
      includedInPrintRate: t.included_in_print_rate ?? false,
    })),
  };
}

export async function createPurchaseTaxTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createPurchaseTaxTemplate(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/purchase-templates");
  redirect(`/accounting/tax/purchase-templates/${encodeURIComponent(created.name)}`);
}

export async function updatePurchaseTaxTemplateAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updatePurchaseTaxTemplate(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/purchase-templates");
  revalidatePath(`/accounting/tax/purchase-templates/${name}`);
  return {};
}

export async function deletePurchaseTaxTemplateAction(name: string): Promise<FormState> {
  try {
    await deletePurchaseTaxTemplate(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/purchase-templates");
  redirect("/accounting/tax/purchase-templates");
}
