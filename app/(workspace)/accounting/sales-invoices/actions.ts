"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSalesInvoice,
  updateSalesInvoice,
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
  // Optional link → Colossal Sales Taxes and Charges Template. When
  // set, the Frappe controller applies the template's tax lines and
  // recomputes grand_total = net + taxes. When blank, the invoice
  // ships without VAT.
  taxes_and_charges: z.string().trim().optional(),
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
  if (err instanceof Error && !(err instanceof FrappeRequestError)) {
    return { error: err.message };
  }
  const raw = err instanceof Error ? err.message : "";
  const status = err instanceof FrappeRequestError ? err.status : undefined;
  const detail = err instanceof FrappeRequestError ? err.detail : undefined;
  return { error: friendlyInvoiceError(raw, status, detail) };
}

/** Pull the real sentence out of a Frappe error body — `_server_messages`
 *  (JSON-in-JSON) for validation throws, `exception` for traceback
 *  strings — and strip the HTML / class prefix. Falls back to a plain
 *  sentence for 500s / network blips so the user never sees "Call
 *  frappe.client.insert failed: 500 INTERNAL SERVER ERROR". */
function friendlyInvoiceError(raw: string, status?: number, detail?: unknown): string {
  const real = extractFrappeMessage(detail);
  if (real) return real;
  const s = raw.toLowerCase();
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission")) {
    return "You don't have permission to save this invoice.";
  }
  if (s.includes("401") || s.includes("unauthorized") || s.includes("login")) {
    return "Your session has expired — refresh the page and sign in again.";
  }
  if (status && status >= 500) {
    return "The server couldn't save this invoice. Check that the picked tax template, items and accounts still exist, then try again.";
  }
  if (s.includes("417") || s.includes("expectation failed")) {
    return "Couldn't save this invoice — the values didn't line up with what the system expected.";
  }
  return "Couldn't save this invoice. Please try again.";
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
      taxesAndCharges: parsed.data.taxes_and_charges || undefined,
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

export async function updateSalesInvoiceAction(
  name: string,
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

  try {
    await updateSalesInvoice(name, {
      customer: parsed.data.customer,
      postingDate: parsed.data.posting_date,
      dueDate: parsed.data.due_date || undefined,
      company: parsed.data.company,
      currency: parsed.data.currency || undefined,
      poNo: parsed.data.po_no || undefined,
      poDate: parsed.data.po_date || undefined,
      remarks: parsed.data.remarks || undefined,
      taxesAndCharges: parsed.data.taxes_and_charges || undefined,
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
  revalidatePath(`/accounting/sales-invoices/${name}`);
  redirect(`/accounting/sales-invoices/${encodeURIComponent(name)}`);
}

export async function submitSalesInvoiceAction(name: string): Promise<FormState> {
  try {
    await submitSalesInvoice(name);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/sales-invoices");
  revalidatePath(`/accounting/sales-invoices/${name}`);
  redirect("/accounting/sales-invoices");
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
