import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Period Closing Voucher" — the year-end voucher that moves
 * income and expense balances into a closing (retained earnings)
 * account so the next fiscal year starts clean.
 */

export type PeriodClosingVoucher = {
  name: string;
  company: string;
  fiscalYear: string;
  postingDate: string;
  closingAccountHead: string;
  docstatus: 0 | 1 | 2;
  transactionDate: string | null;
};

export type PeriodClosingVoucherDetail = PeriodClosingVoucher & {
  costCenter: string | null;
  financeBook: string | null;
  remarks: string | null;
  yearStartDate: string | null;
  yearEndDate: string | null;
};

export async function listPeriodClosings(): Promise<PeriodClosingVoucher[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Period Closing Voucher",
      fields: [
        "name", "company", "fiscal_year", "posting_date",
        "closing_account_head", "docstatus", "transaction_date",
      ],
      order_by: "posting_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    company: String(r.company ?? ""),
    fiscalYear: String(r.fiscal_year ?? ""),
    postingDate: String(r.posting_date ?? ""),
    closingAccountHead: String(r.closing_account_head ?? ""),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
    transactionDate: (r.transaction_date as string | null) ?? null,
  }));
}

export async function getPeriodClosing(name: string): Promise<PeriodClosingVoucherDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Period Closing Voucher", name },
    });
    return {
      name: String(doc.name ?? name),
      company: String(doc.company ?? ""),
      fiscalYear: String(doc.fiscal_year ?? ""),
      postingDate: String(doc.posting_date ?? ""),
      closingAccountHead: String(doc.closing_account_head ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      transactionDate: (doc.transaction_date as string | null) ?? null,
      costCenter: (doc.cost_center as string | null) ?? null,
      financeBook: (doc.finance_book as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
      yearStartDate: (doc.year_start_date as string | null) ?? null,
      yearEndDate: (doc.year_end_date as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PeriodClosingInput = {
  company: string;
  fiscalYear: string;
  postingDate: string;
  closingAccountHead: string;
  costCenter?: string;
  financeBook?: string;
  remarks?: string;
};

export async function createPeriodClosing(input: PeriodClosingInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Period Closing Voucher",
        company: input.company,
        fiscal_year: input.fiscalYear,
        posting_date: input.postingDate,
        transaction_date: input.postingDate,
        closing_account_head: input.closingAccountHead,
        cost_center: input.costCenter || undefined,
        finance_book: input.financeBook || undefined,
        remarks: input.remarks || undefined,
      },
    },
  });
  return { name: created.name };
}

export async function submitPeriodClosing(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Period Closing Voucher", name } },
  });
}

export async function cancelPeriodClosing(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Period Closing Voucher", name },
  });
}

export async function deletePeriodClosing(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Period Closing Voucher", name },
  });
}
