"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createJournalTemplate,
  updateJournalTemplate,
  deleteJournalTemplate,
  VOUCHER_TYPES,
} from "@/lib/frappe/masters/journal-entry-template";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const lineSchema = z.object({
  account: z.string().trim().min(1),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  cost_center: z.string().trim().optional(),
});

const schema = z.object({
  template_title: z.string().trim().min(1, "Template title is required."),
  voucher_type: z.enum(VOUCHER_TYPES as unknown as [string, ...string[]]),
  company: z.string().trim().min(1, "Company is required."),
  accounts_json: z
    .string()
    .trim()
    .default("[]")
    .transform((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return [];
      }
    })
    .pipe(z.array(lineSchema)),
});

function toFormState(err: unknown): FormState {
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof Error && !(err instanceof FrappeRequestError)) {
    return { error: err.message };
  }
  const raw = err instanceof Error ? err.message : "";
  const status = err instanceof FrappeRequestError ? err.status : undefined;
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  const real = extractFrappeMessage(detail);
  if (real) return { error: real };
  const low = raw.toLowerCase();
  if (low.includes("403") || low.includes("forbidden") || low.includes("permission")) {
    return { error: "You don't have permission to save this template." };
  }
  if (low.includes("401") || low.includes("unauthorized") || low.includes("login")) {
    return { error: "Your session has expired — refresh the page and sign in again." };
  }
  if (status && status >= 500) {
    return { error: "The server couldn't save this template. Try again in a moment." };
  }
  return { error: "Couldn't save this template. Please try again." };
}

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

export async function createJournalTemplateAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    created = await createJournalTemplate({
      templateTitle: parsed.data.template_title,
      voucherType: parsed.data.voucher_type,
      company: parsed.data.company,
      accounts: parsed.data.accounts_json.map((l: { account: string; debit: number; credit: number; cost_center?: string }) => ({
        account: l.account,
        debit: l.debit,
        credit: l.credit,
        costCenter: l.cost_center,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/journal-templates");
  redirect(`/accounting/masters/journal-templates/${encodeURIComponent(created.name)}`);
}

export async function updateJournalTemplateAction(name: string, _prev: FormState, formData: FormData): Promise<FormState> {
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
    await updateJournalTemplate(name, {
      templateTitle: parsed.data.template_title,
      voucherType: parsed.data.voucher_type,
      company: parsed.data.company,
      accounts: parsed.data.accounts_json.map((l: { account: string; debit: number; credit: number; cost_center?: string }) => ({
        account: l.account,
        debit: l.debit,
        credit: l.credit,
        costCenter: l.cost_center,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/journal-templates");
  revalidatePath(`/accounting/masters/journal-templates/${name}`);
  return {};
}

export async function deleteJournalTemplateAction(name: string): Promise<FormState> {
  try {
    await deleteJournalTemplate(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/journal-templates");
  redirect("/accounting/masters/journal-templates");
}
