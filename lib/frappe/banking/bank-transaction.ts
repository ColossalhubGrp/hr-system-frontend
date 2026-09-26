import "server-only";
import { frappeCall } from "../client";

/**
 * ERPNext "Bank Transaction" — one row per bank statement line. The
 * Bank Reconciliation Tool matches these to Payment Entries / Journal
 * Entries.
 */

export type BankTransaction = {
  name: string;
  date: string;
  bankAccount: string;
  description: string | null;
  deposit: number;
  withdrawal: number;
  status: string;
  referenceNumber: string | null;
  currency: string | null;
  allocatedAmount: number;
  unallocatedAmount: number;
};

export async function listBankTransactions(opts: { bankAccount?: string; from?: string; to?: string; status?: string } = {}): Promise<BankTransaction[]> {
  const filters: [string, string, unknown][] = [];
  if (opts.bankAccount) filters.push(["bank_account", "=", opts.bankAccount]);
  if (opts.from) filters.push(["date", ">=", opts.from]);
  if (opts.to) filters.push(["date", "<=", opts.to]);
  if (opts.status) filters.push(["status", "=", opts.status]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Bank Transaction",
      fields: [
        "name", "date", "bank_account", "description", "deposit",
        "withdrawal", "status", "reference_number", "currency",
        "allocated_amount", "unallocated_amount",
      ],
      filters,
      order_by: "date desc",
      limit_page_length: 200,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    date: String(r.date ?? ""),
    bankAccount: String(r.bank_account ?? ""),
    description: (r.description as string | null) ?? null,
    deposit: Number(r.deposit ?? 0),
    withdrawal: Number(r.withdrawal ?? 0),
    status: String(r.status ?? "Pending"),
    referenceNumber: (r.reference_number as string | null) ?? null,
    currency: (r.currency as string | null) ?? null,
    allocatedAmount: Number(r.allocated_amount ?? 0),
    unallocatedAmount: Number(r.unallocated_amount ?? 0),
  }));
}
