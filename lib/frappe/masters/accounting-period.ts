import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Accounting Period" — a locked window of dates (usually a
 * month or quarter) inside which certain doctypes can no longer be
 * posted or edited. Used to keep audit trails clean after a
 * close.
 */

export type AccountingPeriod = {
  name: string;
  periodName: string;
  startDate: string;
  endDate: string;
  company: string;
};

export type ClosedDocument = {
  idx: number;
  documentType: string;
  closed: boolean;
};

export type AccountingPeriodDetail = AccountingPeriod & {
  closedDocuments: ClosedDocument[];
};

export async function listAccountingPeriods(): Promise<AccountingPeriod[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Accounting Period",
      fields: ["name", "period_name", "start_date", "end_date", "company"],
      order_by: "start_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    periodName: String(r.period_name ?? r.name ?? ""),
    startDate: String(r.start_date ?? ""),
    endDate: String(r.end_date ?? ""),
    company: String(r.company ?? ""),
  }));
}

export async function getAccountingPeriod(name: string): Promise<AccountingPeriodDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Accounting Period", name },
    });
    const closed = (doc.closed_documents as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      periodName: String(doc.period_name ?? doc.name ?? ""),
      startDate: String(doc.start_date ?? ""),
      endDate: String(doc.end_date ?? ""),
      company: String(doc.company ?? ""),
      closedDocuments: closed.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        documentType: String(r.document_type ?? ""),
        closed: Number(r.closed ?? 0) === 1,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type AccountingPeriodInput = {
  periodName: string;
  startDate: string;
  endDate: string;
  company: string;
};

export async function createAccountingPeriod(input: AccountingPeriodInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Accounting Period",
    period_name: input.periodName,
    start_date: input.startDate,
    end_date: input.endDate,
    company: input.company,
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateAccountingPeriod(name: string, input: AccountingPeriodInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Accounting Period",
      name,
      fieldname: {
        period_name: input.periodName,
        start_date: input.startDate,
        end_date: input.endDate,
        company: input.company,
      },
    },
  });
}

export async function deleteAccountingPeriod(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Accounting Period", name },
  });
}
