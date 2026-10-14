import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
import { submitDoc } from "../submit-doc";

/**
 * ERPNext "Colossal Period Closing Voucher" — the year-end voucher that moves
 * income and expense balances into a closing (retained earnings)
 * account so the next fiscal year starts clean.
 */

// ERPNext renamed the posting-date field to `period_end_date` and
// added `period_start_date` (the old `posting_date` is the latter's
// `oldfieldname`). Neither `cost_center` nor `finance_book` exists
// on this DocType. Asking Frappe for a non-existent column makes
// get_list reject the whole query, which showed up on the client
// as the bare "Server Components render" error.
export type PeriodClosingVoucher = {
  name: string;
  company: string;
  fiscalYear: string;
  periodEndDate: string;
  closingAccountHead: string;
  docstatus: 0 | 1 | 2;
  transactionDate: string | null;
};

export type PeriodClosingVoucherDetail = PeriodClosingVoucher & {
  remarks: string | null;
  periodStartDate: string | null;
};

export async function listPeriodClosings(): Promise<PeriodClosingVoucher[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Colossal Period Closing Voucher",
      fields: [
        "name", "company", "fiscal_year", "period_end_date",
        "closing_account_head", "docstatus", "transaction_date",
      ],
      order_by: "period_end_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    company: String(r.company ?? ""),
    fiscalYear: String(r.fiscal_year ?? ""),
    periodEndDate: String(r.period_end_date ?? ""),
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
      args: { doctype: "Colossal Period Closing Voucher", name },
    });
    return {
      name: String(doc.name ?? name),
      company: String(doc.company ?? ""),
      fiscalYear: String(doc.fiscal_year ?? ""),
      periodEndDate: String(doc.period_end_date ?? ""),
      closingAccountHead: String(doc.closing_account_head ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      transactionDate: (doc.transaction_date as string | null) ?? null,
      remarks: (doc.remarks as string | null) ?? null,
      periodStartDate: (doc.period_start_date as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PeriodClosingInput = {
  company: string;
  fiscalYear: string;
  periodStartDate: string;
  periodEndDate: string;
  closingAccountHead: string;
  remarks?: string;
};

export async function createPeriodClosing(input: PeriodClosingInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Colossal Period Closing Voucher",
        company: input.company,
        fiscal_year: input.fiscalYear,
        period_start_date: input.periodStartDate,
        period_end_date: input.periodEndDate,
        transaction_date: input.periodEndDate,
        closing_account_head: input.closingAccountHead,
        remarks: input.remarks || undefined,
      },
    },
  });
  return { name: created.name };
}

export async function submitPeriodClosing(name: string): Promise<void> {
  await submitDoc("Colossal Period Closing Voucher", name);
}

export async function cancelPeriodClosing(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Colossal Period Closing Voucher", name },
  });
}

export async function deletePeriodClosing(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Colossal Period Closing Voucher", name },
  });
}
