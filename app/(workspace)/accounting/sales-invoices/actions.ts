"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSalesInvoice,
  submitSalesInvoice,
  cancelSalesInvoice,
} from "@/lib/frappe/sales-invoice";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const itemSchema = z.object({
  item_code: z.string().trim().min(1, "Item is required."),
  qty: z.coerce.number().gt(0, "Qty must be > 0."),
  rate: z.coerce.number().min(0, "Rate must be >= 0."),
  uom: z.string().trim().optional(),
  description: z.string().trim().optional(),
  income_account: z.string().trim().optional(),
  cost_center: z.string().trim().optional(),
});

const createSchema = z.object({
  customer: z.string().trim().min(1, "Customer is required."),
  posting_date: isoDate,
  due_date: z.string().trim().optional(),
  company: z.string().trim().min(1, "Company is required."),
  currency: z.string().trim().optional(),
  po_no: z.string().trim().optional(),
  po_date: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  items_json: z
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
    .pipe(z.array(itemSchema).min(1, "Add at least one line item.")),
});

function toFormState(err: unknown): FormState {
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

export async function createSalesInvoiceAction(
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
    created = await createSalesInvoice({
      customer: parsed.data.customer,
      postingDate: parsed.data.posting_date,
      dueDate: parsed.data.due_date || undefined,
      company: parsed.data.company,
      currency: parsed.data.currency || undefined,
      poNo: parsed.data.po_no || undefined,
      poDate: parsed.data.po_date || undefined,
      remarks: parsed.data.remarks || undefined,
      items: parsed.data.items_json.map((i) => ({
        itemCode: i.item_code,
        qty: i.qty,
        rate: i.rate,
        uom: i.uom,
        description: i.description,
        incomeAccount: i.income_account,
        costCenter: i.cost_center,
      })),
    });
  } catch (err) {
    return toFormState(err);
  }

  revalidatePath("/accounting/sales-invoices");
  redirect(`/accounting/sales-invoices/${encodeURIComponent(created.name)}`);
}

export async function submitSalesInvoiceAction(name: string): Promise<FormState> {
  try {
    await submitSalesInvoice(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/sales-invoices");
  revalidatePath(`/accounting/sales-invoices/${name}`);
  return {};
}

export async function cancelSalesInvoiceAction(name: string): Promise<FormState> {
  try {
    await cancelSalesInvoice(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/sales-invoices");
  revalidatePath(`/accounting/sales-invoices/${name}`);
  return {};
}
