"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSalesTaxTemplate,
  updateSalesTaxTemplate,
  deleteSalesTaxTemplate,
  CHARGE_TYPES,
} from "@/lib/frappe/tax/sales-template";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const lineSchema = z.object({
  charge_type: z.enum(CHARGE_TYPES as unknown as [string, ...string[]]),
  account_head: z.string().trim().min(1),
  description: z.string().trim().min(1),
  rate: z.coerce.number(),
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
  // Plain Error from our own pre-save guards (e.g. the account-company
  // mismatch check) carries the exact user-facing sentence we wrote.
  // Surface it verbatim; don't let the Frappe humaniser swallow it.
  if (err instanceof Error && !(err instanceof FrappeRequestError)) {
    return { error: err.message };
  }
  const raw = err instanceof Error ? err.message : "";
  const status = err instanceof FrappeRequestError ? err.status : undefined;
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  return { error: friendlyTaxTemplateError(raw, status, detail) };
}

/** Pull the human sentence out of a Frappe error body. Frappe wraps the
 *  real reason in `_server_messages` (JSON-in-JSON) and tags the exc
 *  class on `exception`; everything else is Python traceback noise. */
function extractFrappeMessage(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const obj = detail as Record<string, unknown>;
  const exc = obj.exception;
  if (typeof exc === "string" && exc.trim()) {
    const stripped = stripHtml(exc.replace(/^[\w.]+:\s*/, "")).trim();
    if (stripped) return stripped;
  }
  const sm = obj._server_messages;
  if (typeof sm === "string") {
    try {
      const arr = JSON.parse(sm) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const parsed = arr.map((e) => (typeof e === "string" ? JSON.parse(e) : e)) as Array<{
        message?: string;
        indicator?: string;
      }>;
      const err = parsed.find((e) => e?.indicator === "red" || e?.indicator === "orange");
      const pick = err ?? parsed[0];
      const msg = pick?.message;
      if (msg) return stripHtml(String(msg)).trim();
    } catch { /* fall through */ }
  }
  return null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*(br|\/li|\/p|\/div|\/ul|\/ol)\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep internal Frappe wording (frappe.client.save, 417 EXPECTATION
 *  FAILED, Python tracebacks) out of the Save-changes banner. */
function friendlyTaxTemplateError(raw: string, status?: number, detail?: unknown): string {
  const real = extractFrappeMessage(detail);
  if (real) {
    // Frappe already wrote a user-facing sentence (e.g. "Row #1: Account
    // X does not belong to Company Y"). Surface it verbatim; our generic
    // fallbacks only kick in when there's no server message.
    return real;
  }
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
      costCenter: t.cost_center,
      includedInPrintRate: t.included_in_print_rate ?? false,
    })),
  };
}

export async function createSalesTaxTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createSalesTaxTemplate(toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/sales-templates");
  redirect(`/accounting/tax/sales-templates/${encodeURIComponent(created.name)}`);
}

export async function updateSalesTaxTemplateAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateSalesTaxTemplate(name, toInput(parsed.data));
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/sales-templates");
  revalidatePath(`/accounting/tax/sales-templates/${name}`);
  redirect("/accounting/tax/sales-templates");
}

export async function deleteSalesTaxTemplateAction(name: string): Promise<FormState> {
  try {
    await deleteSalesTaxTemplate(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/tax/sales-templates");
  redirect("/accounting/tax/sales-templates");
}
