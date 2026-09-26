import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Payment Term" master — Net 30, Advance 50%, etc. Sales
 * Invoice and Purchase Invoice apply these to compute the due date.
 */

export const DUE_BASIS = ["Day(s) after invoice date", "Day(s) after the end of the invoice month", "Month(s) after the end of the invoice month"] as const;
export const DISCOUNT_TYPES = ["Percentage", "Amount"] as const;

export type PaymentTerm = {
  name: string;
  paymentTermName: string;
  invoicePortion: number;
  creditDays: number;
  creditMonths: number;
  dueDateBasedOn: string;
  discount: number;
  discountType: string;
};

export type PaymentTermDetail = PaymentTerm & {
  description: string | null;
};

export async function listPaymentTerms(): Promise<PaymentTerm[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Payment Term",
      fields: [
        "name",
        "payment_term_name",
        "invoice_portion",
        "credit_days",
        "credit_months",
        "due_date_based_on",
        "discount",
        "discount_type",
      ],
      order_by: "payment_term_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    paymentTermName: String(r.payment_term_name ?? r.name ?? ""),
    invoicePortion: Number(r.invoice_portion ?? 100),
    creditDays: Number(r.credit_days ?? 0),
    creditMonths: Number(r.credit_months ?? 0),
    dueDateBasedOn: String(r.due_date_based_on ?? "Day(s) after invoice date"),
    discount: Number(r.discount ?? 0),
    discountType: String(r.discount_type ?? "Percentage"),
  }));
}

export async function getPaymentTerm(name: string): Promise<PaymentTermDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Payment Term", name },
    });
    return {
      name: String(doc.name ?? name),
      paymentTermName: String(doc.payment_term_name ?? doc.name ?? ""),
      invoicePortion: Number(doc.invoice_portion ?? 100),
      creditDays: Number(doc.credit_days ?? 0),
      creditMonths: Number(doc.credit_months ?? 0),
      dueDateBasedOn: String(doc.due_date_based_on ?? "Day(s) after invoice date"),
      discount: Number(doc.discount ?? 0),
      discountType: String(doc.discount_type ?? "Percentage"),
      description: (doc.description as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PaymentTermInput = {
  paymentTermName: string;
  description?: string;
  invoicePortion: number;
  creditDays: number;
  creditMonths: number;
  dueDateBasedOn: string;
  discount: number;
  discountType: string;
};

export async function createPaymentTerm(input: PaymentTermInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Payment Term",
    payment_term_name: input.paymentTermName,
    description: input.description || undefined,
    invoice_portion: input.invoicePortion,
    credit_days: input.creditDays,
    credit_months: input.creditMonths,
    due_date_based_on: input.dueDateBasedOn,
    discount: input.discount,
    discount_type: input.discountType,
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updatePaymentTerm(name: string, input: PaymentTermInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Payment Term",
      name,
      fieldname: {
        payment_term_name: input.paymentTermName,
        description: input.description || null,
        invoice_portion: input.invoicePortion,
        credit_days: input.creditDays,
        credit_months: input.creditMonths,
        due_date_based_on: input.dueDateBasedOn,
        discount: input.discount,
        discount_type: input.discountType,
      },
    },
  });
}

export async function deletePaymentTerm(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Payment Term", name },
  });
}
