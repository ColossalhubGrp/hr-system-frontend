import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Company" master. The Company DocType has ~80 fields — we
 * surface the ones users touch: identity + default accounts + basic
 * settings. Advanced fields (email templates, fixed asset config,
 * gain/loss buckets beyond the standard four) fall through to Desk
 * if a caller needs them.
 */

export type CompanyRow = {
  name: string;
  companyName: string;
  abbr: string;
  defaultCurrency: string;
  country: string | null;
  isGroup: boolean;
};

export type CompanyDetail = {
  name: string;
  companyName: string;
  abbr: string;
  defaultCurrency: string;
  country: string | null;
  taxId: string | null;
  domain: string | null;
  defaultHolidayList: string | null;
  costCenter: string | null;
  roundOffAccount: string | null;
  roundOffCostCenter: string | null;
  writeOffAccount: string | null;
  defaultBankAccount: string | null;
  defaultCashAccount: string | null;
  defaultReceivableAccount: string | null;
  defaultPayableAccount: string | null;
  defaultIncomeAccount: string | null;
  defaultExpenseAccount: string | null;
  exchangeGainLossAccount: string | null;
  isGroup: boolean;
  disabled: boolean;
};

export async function listCompanyMasters(): Promise<CompanyRow[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Company",
      fields: ["name", "company_name", "abbr", "default_currency", "country", "is_group"],
      order_by: "company_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    companyName: String(r.company_name ?? r.name ?? ""),
    abbr: String(r.abbr ?? ""),
    defaultCurrency: String(r.default_currency ?? "USD"),
    country: (r.country as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
  }));
}

export async function getCompanyMaster(name: string): Promise<CompanyDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Company", name },
    });
    return {
      name: String(doc.name ?? name),
      companyName: String(doc.company_name ?? doc.name ?? ""),
      abbr: String(doc.abbr ?? ""),
      defaultCurrency: String(doc.default_currency ?? "USD"),
      country: (doc.country as string | null) ?? null,
      taxId: (doc.tax_id as string | null) ?? null,
      domain: (doc.domain as string | null) ?? null,
      defaultHolidayList: (doc.default_holiday_list as string | null) ?? null,
      costCenter: (doc.cost_center as string | null) ?? null,
      roundOffAccount: (doc.round_off_account as string | null) ?? null,
      roundOffCostCenter: (doc.round_off_cost_center as string | null) ?? null,
      writeOffAccount: (doc.write_off_account as string | null) ?? null,
      defaultBankAccount: (doc.default_bank_account as string | null) ?? null,
      defaultCashAccount: (doc.default_cash_account as string | null) ?? null,
      defaultReceivableAccount: (doc.default_receivable_account as string | null) ?? null,
      defaultPayableAccount: (doc.default_payable_account as string | null) ?? null,
      defaultIncomeAccount: (doc.default_income_account as string | null) ?? null,
      defaultExpenseAccount: (doc.default_expense_account as string | null) ?? null,
      exchangeGainLossAccount: (doc.exchange_gain_loss_account as string | null) ?? null,
      isGroup: Number(doc.is_group ?? 0) === 1,
      disabled: Number(doc.disabled ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CompanyCreateInput = {
  companyName: string;
  abbr: string;
  defaultCurrency: string;
  country: string;
  chartOfAccounts?: string;
  taxId?: string;
  domain?: string;
};

export async function createCompanyMaster(input: CompanyCreateInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Company",
        company_name: input.companyName,
        abbr: input.abbr,
        default_currency: input.defaultCurrency,
        country: input.country,
        chart_of_accounts: input.chartOfAccounts || undefined,
        tax_id: input.taxId || undefined,
        domain: input.domain || undefined,
      },
    },
  });
  return { name: created.name };
}

export type CompanyUpdateInput = Partial<{
  tax_id: string | null;
  domain: string | null;
  default_holiday_list: string | null;
  cost_center: string | null;
  round_off_account: string | null;
  round_off_cost_center: string | null;
  write_off_account: string | null;
  default_bank_account: string | null;
  default_cash_account: string | null;
  default_receivable_account: string | null;
  default_payable_account: string | null;
  default_income_account: string | null;
  default_expense_account: string | null;
  exchange_gain_loss_account: string | null;
  disabled: 0 | 1;
}>;

export async function updateCompanyMaster(name: string, patch: CompanyUpdateInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Company",
      name,
      fieldname: patch,
    },
  });
}

export async function deleteCompanyMaster(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Company", name },
  });
}

export async function listCountries(): Promise<string[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Country",
      fields: ["name"],
      order_by: "name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => String(r.name ?? "")).filter(Boolean);
}

export async function listCurrencies(): Promise<string[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Currency",
      fields: ["name"],
      filters: [["enabled", "=", 1]],
      order_by: "name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => String(r.name ?? "")).filter(Boolean);
}
