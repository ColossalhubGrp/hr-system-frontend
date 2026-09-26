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
  company: z.string().trim().optional(),
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
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
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
