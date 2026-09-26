import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Fiscal Year" — the accounting calendar. Reports use this to
 * compute opening balances and year-to-date columns.
 */

export type FiscalYear = {
  name: string;
  yearStartDate: string;
  yearEndDate: string;
  disabled: boolean;
  autoCreated: boolean;
};

export type FiscalYearDetail = FiscalYear & {
  companies: string[];
};

export async function listFiscalYears(): Promise<FiscalYear[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Fiscal Year",
      fields: ["name", "year_start_date", "year_end_date", "disabled", "auto_created"],
      order_by: "year_start_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    yearStartDate: String(r.year_start_date ?? ""),
    yearEndDate: String(r.year_end_date ?? ""),
    disabled: Number(r.disabled ?? 0) === 1,
    autoCreated: Number(r.auto_created ?? 0) === 1,
  }));
}

export async function getFiscalYear(name: string): Promise<FiscalYearDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Fiscal Year", name },
    });
    const companies = (doc.companies as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      yearStartDate: String(doc.year_start_date ?? ""),
      yearEndDate: String(doc.year_end_date ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
      autoCreated: Number(doc.auto_created ?? 0) === 1,
      companies: companies.map((c) => String(c.company ?? "")).filter(Boolean),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type FiscalYearInput = {
  name: string;
  yearStartDate: string;
  yearEndDate: string;
  disabled: boolean;
  companies: string[];
};

export async function createFiscalYear(input: FiscalYearInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Fiscal Year",
    year: input.name,
    year_start_date: input.yearStartDate,
    year_end_date: input.yearEndDate,
    disabled: input.disabled ? 1 : 0,
    companies: input.companies.map((c) => ({ company: c })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateFiscalYear(name: string, input: Omit<FiscalYearInput, "name">): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Fiscal Year",
      name,
      fieldname: {
        year_start_date: input.yearStartDate,
        year_end_date: input.yearEndDate,
        disabled: input.disabled ? 1 : 0,
      },
    },
  });
  // Child-table save
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Fiscal Year",
        name,
        companies: input.companies.map((c) => ({ company: c })),
      },
    },
  });
}

export async function deleteFiscalYear(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Fiscal Year", name },
  });
}
