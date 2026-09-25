"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createJournalEntry,
  submitJournalEntry,
  cancelJournalEntry,
  VOUCHER_TYPES,
  type VoucherType,
} from "@/lib/frappe/accounting";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const lineSchema = z
  .object({
    account: z.string().trim().min(1, "Account is required."),
    party_type: z.string().trim().optional(),
    party: z.string().trim().optional(),
    debit: z.coerce.number().min(0).default(0),
    credit: z.coerce.number().min(0).default(0),
    cost_center: z.string().trim().optional(),
    user_remark: z.string().trim().optional(),
  })
  .refine(
    (l) => (l.debit || 0) > 0 || (l.credit || 0) > 0,
    { message: "Each line needs either a debit or a credit greater than zero.", path: ["debit"] },
  )
  .refine(
    (l) => !((l.debit || 0) > 0 && (l.credit || 0) > 0),
    { message: "A single line is either a debit or a credit, not both.", path: ["credit"] },
  );

const createSchema = z
  .object({
    voucher_type: z.enum(VOUCHER_TYPES as [VoucherType, ...VoucherType[]]),
    posting_date: isoDate,
    company: z.string().trim().min(1, "Company is required."),
    cheque_no: z.string().trim().optional(),
    cheque_date: z.string().trim().optional(),
    user_remark: z.string().trim().optional(),
    // Client posts the child table as a JSON blob so the form can keep
    // the whole grid in one hidden input — matches the pattern the
    // expense-claims form uses.
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
      .pipe(z.array(lineSchema).min(2, "A Journal Entry needs at least two lines (one debit, one credit).")),
  })
  .refine(
    (v) => {
      const totalDebit = v.accounts_json.reduce((a, l) => a + (l.debit || 0), 0);
      const totalCredit = v.accounts_json.reduce((a, l) => a + (l.credit || 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.005;
    },
    {
      message: "Debits and credits must balance exactly before you can save.",
      path: ["accounts_json"],
    },
  );

function toFormState(err: unknown): FormState {
  // Never swallow next/navigation redirects — same pattern as expense-claims.
  if (typeof err === "object" && err !== null) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
    if (digest === "NEXT_NOT_FOUND") throw err;
  }
  if (err instanceof FrappeRequestError) {
    return { error: err.message || `Backend error (${err.status}).` };
  }
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  return { error: msg };
}

export async function createJournalEntryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
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
    created = await createJournalEntry({
      voucherType: parsed.data.voucher_type,
      postingDate: parsed.data.posting_date,
      company: parsed.data.company,
      chequeNo: parsed.data.cheque_no || undefined,
      chequeDate: parsed.data.cheque_date || undefined,
      userRemark: parsed.data.user_remark || undefined,
      accounts: parsed.data.accounts_json.map((l) => ({
        account: l.account,
        partyType: l.party_type,
        party: l.party,
        debit: l.debit,
        credit: l.credit,
        costCenter: l.cost_center,
        userRemark: l.user_remark,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/accounting/journal-entries");
  redirect(`/accounting/journal-entries/${encodeURIComponent(created.name)}`);
}

export async function submitJournalEntryAction(name: string): Promise<FormState> {
  try {
    await submitJournalEntry(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${name}`);
  return {};
}

export async function cancelJournalEntryAction(name: string): Promise<FormState> {
  try {
    await cancelJournalEntry(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/journal-entries");
  revalidatePath(`/accounting/journal-entries/${name}`);
  return {};
}
