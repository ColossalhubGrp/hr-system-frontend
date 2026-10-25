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
  const raw = err instanceof Error ? err.message : "";
  const status = err instanceof FrappeRequestError ? err.status : undefined;
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  return { error: friendlyTaxTemplateError(raw, status, detail) };
}

function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (Array.isArray(arr) && arr.length > 0) {
        const first = typeof arr[0] === "string" ? JSON.parse(arr[0]) : arr[0];
        const msg = (first as { message?: string })?.message;
        if (msg) return String(msg).replace(/<[^>]+>/g, "").trim();
      }
    } catch { /* fall through */ }
  }
  const exc = obj.exception;
  if (typeof exc === "string") {
    const stripped = exc.replace(/^[\w.]+:\s*/, "").trim();
    if (stripped) return stripped;
  }
  return null;
}

function friendlyTaxTemplateError(raw: string, status?: number, detail?: unknown): string {
  const real = extractFrappeMessage(detail);
  if (real) return real;
  const s = raw.toLowerCase();
  if (!raw) return "Couldn't save this tax template. Please try again.";
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
    return "You don't have permission to change this tax template.";
  }
  if (s.includes("401") || s.includes("unauthorized") || s.includes("login")) {
    return "Your session has expired — refresh the page and sign in again.";
  }
  if (s.includes("duplicate") || s.includes("already exists") || s.includes("409")) {
    return "A template with that title already exists for this company.";
  }
  if (status && status >= 500) {
    return "The server couldn't finish saving this template. Try again in a moment.";
  }
  return "Couldn't save this tax template. Please try again.";
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
