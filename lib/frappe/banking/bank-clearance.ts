import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Bank Clearance" — mark payment/journal entries as cleared
 * against a bank account on a given date. The upstream doctype's job
 * is to load pending vouchers, take a clearance_date per row, and
 * post the clearance back to each voucher.
 */

export type BankClearance = {
  name: string;
  account: string;
  fromDate: string;
  toDate: string;
  bankAccount: string | null;
  docstatus: 0 | 1 | 2;
};

export type ClearanceRow = {
  idx: number;
  paymentDocument: string;
  paymentEntry: string;
  postingDate: string;
  chequeNumber: string | null;
  chequeDate: string | null;
  clearanceDate: string | null;
  amount: number;
};

export type BankClearanceDetail = BankClearance & {
  payments: ClearanceRow[];
  includeReconciledEntries: boolean;
  includePos: boolean;
};

export async function listBankClearances(): Promise<BankClearance[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Bank Clearance",
      fields: ["name", "account", "from_date", "to_date", "bank_account", "docstatus"],
      order_by: "creation desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    account: String(r.account ?? ""),
    fromDate: String(r.from_date ?? ""),
    toDate: String(r.to_date ?? ""),
    bankAccount: (r.bank_account as string | null) ?? null,
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));
}

export async function getBankClearance(name: string): Promise<BankClearanceDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Bank Clearance", name },
    });
    const payments = (doc.payment_entries as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      account: String(doc.account ?? ""),
      fromDate: String(doc.from_date ?? ""),
      toDate: String(doc.to_date ?? ""),
      bankAccount: (doc.bank_account as string | null) ?? null,
      includeReconciledEntries: Number(doc.include_reconciled_entries ?? 0) === 1,
      includePos: Number(doc.include_pos_transactions ?? 0) === 1,
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      payments: payments.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        paymentDocument: String(r.payment_document ?? ""),
        paymentEntry: String(r.payment_entry ?? ""),
        postingDate: String(r.posting_date ?? ""),
        chequeNumber: (r.cheque_number as string | null) ?? null,
        chequeDate: (r.cheque_date as string | null) ?? null,
        clearanceDate: (r.clearance_date as string | null) ?? null,
        amount: Number(r.amount ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function createBankClearance(input: { account: string; fromDate: string; toDate: string; bankAccount?: string }): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Bank Clearance",
        account: input.account,
        from_date: input.fromDate,
        to_date: input.toDate,
        bank_account: input.bankAccount || undefined,
      },
    },
  });
  return { name: created.name };
}

export async function loadClearancePayments(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.run_doc_method",
    as: "user",
    verb: "POST",
    args: {
      dt: "Bank Clearance",
      dn: name,
      method: "get_payment_entries",
    },
  });
}

export async function saveClearanceDates(name: string, rows: Array<{ idx: number; clearanceDate: string | null }>): Promise<void> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Bank Clearance", name },
  });
  const payments = (doc.payment_entries as Array<Record<string, unknown>>) ?? [];
  const patched = payments.map((p) => {
    const match = rows.find((r) => r.idx === Number(p.idx));
    return { ...p, clearance_date: match?.clearanceDate ?? null };
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc: { ...doc, doctype: "Bank Clearance", name, payment_entries: patched } },
  });
}

export async function submitBankClearance(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.run_doc_method",
    as: "user",
    verb: "POST",
    args: {
      dt: "Bank Clearance",
      dn: name,
      method: "update_clearance_date",
    },
  });
}

export async function deleteBankClearance(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Bank Clearance", name },
  });
}
