"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createOpeningInvoices } from "@/lib/frappe/tools/opening-invoice";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string> };

const rowSchema = z.object({
  party: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  temporary_opening_account: z.string().trim().min(1),
  posting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  due_date: z.string().trim().optional(),
  invoice_number: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  item_description: z.string().trim().optional(),
});

const schema = z.object({
  company: z.string().trim().min(1, "Company is required."),
  invoice_type: z.enum(["Sales", "Purchase"]),
  rows_json: z.string().trim().default("[]").transform((s) => {
    try { return JSON.parse(s); } catch { return []; }
  }).pipe(z.array(rowSchema).min(1, "Add at least one invoice row.")),
});

function toFormState(err: unknown): FormState {
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

type RowInput = z.infer<typeof rowSchema>;

export async function createOpeningInvoicesAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
    const { names } = await createOpeningInvoices({
      company: parsed.data.company,
      invoiceType: parsed.data.invoice_type,
      invoices: parsed.data.rows_json.map((r: RowInput) => ({
        party: r.party,
        amount: r.amount,
        temporaryOpeningAccount: r.temporary_opening_account,
        postingDate: r.posting_date,
        dueDate: r.due_date,
        invoiceNumber: r.invoice_number,
        currency: r.currency,
        itemDescription: r.item_description,
      })),
    });
    revalidatePath("/accounting/sales-invoices");
    revalidatePath("/accounting/purchase-invoices");
    return { ok: `Created ${names.length} opening ${parsed.data.invoice_type} invoices.` };
  } catch (err) {
    return toFormState(err);
  }
}
