"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createItemTaxTemplate,
  updateItemTaxTemplate,
  deleteItemTaxTemplate,
} from "@/lib/frappe/tax/item-template";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const rowSchema = z.object({ tax_type: z.string().trim().min(1), tax_rate: z.coerce.number() });

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  company: z.string().trim().min(1, "Company is required."),
  disabled: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  taxes_json: z.string().trim().default("[]").transform((s) => { try { return JSON.parse(s); } catch { return []; } }).pipe(z.array(rowSchema)),
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

type TaxRow = z.infer<typeof rowSchema>;

export async function createItemTaxTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createItemTaxTemplate({
      title: parsed.data.title,
      company: parsed.data.company,
      disabled: parsed.data.disabled,
      taxes: parsed.data.taxes_json.map((t: TaxRow) => ({ taxType: t.tax_type, taxRate: t.tax_rate })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/item-templates");
  redirect(`/accounting/tax/item-templates/${encodeURIComponent(created.name)}`);
}

export async function updateItemTaxTemplateAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateItemTaxTemplate(name, {
      title: parsed.data.title,
      company: parsed.data.company,
      disabled: parsed.data.disabled,
      taxes: parsed.data.taxes_json.map((t: TaxRow) => ({ taxType: t.tax_type, taxRate: t.tax_rate })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/item-templates");
  revalidatePath(`/accounting/tax/item-templates/${name}`);
  return {};
}

export async function deleteItemTaxTemplateAction(name: string): Promise<FormState> {
  try {
    await deleteItemTaxTemplate(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/item-templates");
  redirect("/accounting/tax/item-templates");
}
