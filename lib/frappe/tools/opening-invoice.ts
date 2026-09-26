import "server-only";
import { frappeCall } from "../client";

/**
 * ERPNext "Opening Invoice Creation Tool" — bulk-create opening
 * Sales or Purchase Invoices for one company. Used during migration
 * to seed customer/supplier balances.
 */

export type OpeningInvoiceRow = {
  party: string;
  amount: number;
  temporaryOpeningAccount: string;
  postingDate: string;
  dueDate?: string;
  invoiceNumber?: string;
  currency?: string;
  itemDescription?: string;
};

export async function createOpeningInvoices(opts: {
  company: string;
  invoiceType: "Sales" | "Purchase";
  invoices: OpeningInvoiceRow[];
}): Promise<{ names: string[] }> {
  const raw = await frappeCall<{ message?: unknown }>({
    method: "erpnext.accounts.doctype.opening_invoice_creation_tool.opening_invoice_creation_tool.make_invoices",
    as: "user",
    verb: "POST",
    args: {
      args: JSON.stringify({
        company: opts.company,
        invoice_type: opts.invoiceType,
        invoices: opts.invoices.map((r) => ({
          party: r.party,
          outstanding_amount: r.amount,
          temporary_opening_account: r.temporaryOpeningAccount,
          posting_date: r.postingDate,
          due_date: r.dueDate,
          invoice_number: r.invoiceNumber,
          currency: r.currency,
          item_description: r.itemDescription,
        })),
      }),
    },
  });
  const names = Array.isArray(raw?.message)
    ? (raw?.message as string[])
    : raw?.message
    ? [String(raw.message)]
    : [];
  return { names };
}
