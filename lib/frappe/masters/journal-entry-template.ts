import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
export { VOUCHER_TYPES } from "./journal-entry-template-constants";

/**
 * ERPNext "Colossal Journal Entry Template" master — a saved template of an
 * accounts child table + voucher type. Speeds up recurring postings
 * (payroll runs, month-end accruals, etc.).
 */

export type JournalEntryTemplate = {
  name: string;
  templateTitle: string;
  voucherType: string;
  company: string | null;
};

export type JournalTemplateAccount = {
  idx: number;
  account: string;
  debitInAccountCurrency: number;
  creditInAccountCurrency: number;
  partyType: string | null;
  costCenter: string | null;
  referenceType: string | null;
};

export type JournalEntryTemplateDetail = JournalEntryTemplate & {
  namingSeries: string | null;
  accounts: JournalTemplateAccount[];
};

export async function listJournalTemplates(): Promise<JournalEntryTemplate[]> {
  // `is_system_generated` is a Frappe-core flag only present on
  // framework System DocTypes; it does NOT exist on the ERPNext
  // Journal Entry Template, and asking for it in get_list makes
  // Frappe reject the whole query (which showed up on the client
  // as a bare "An error occurred in the Server Components render"
  // because Next.js hides server errors in prod).
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Colossal Journal Entry Template",
      fields: ["name", "template_title", "voucher_type", "company"],
      order_by: "template_title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    templateTitle: String(r.template_title ?? r.name ?? ""),
    voucherType: String(r.voucher_type ?? "Journal Entry"),
    company: (r.company as string | null) ?? null,
  }));
}

export async function getJournalTemplate(name: string): Promise<JournalEntryTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Colossal Journal Entry Template", name },
    });
    const accounts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      templateTitle: String(doc.template_title ?? doc.name ?? ""),
      voucherType: String(doc.voucher_type ?? "Journal Entry"),
      company: (doc.company as string | null) ?? null,
      namingSeries: (doc.naming_series as string | null) ?? null,
      accounts: accounts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        account: String(r.account ?? ""),
        debitInAccountCurrency: Number(r.debit_in_account_currency ?? 0),
        creditInAccountCurrency: Number(r.credit_in_account_currency ?? 0),
        partyType: (r.party_type as string | null) ?? null,
        costCenter: (r.cost_center as string | null) ?? null,
        referenceType: (r.reference_type as string | null) ?? null,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type JournalTemplateInput = {
  templateTitle: string;
  voucherType: string;
  /** Mandatory on the doctype — a template always belongs to a company. */
  company: string;
  accounts: Array<{ account: string; debit: number; credit: number; costCenter?: string }>;
};

/** naming_series is reqd on the doctype but never shown to the user
 *  (the doc is actually named by template_title); Desk fills it from
 *  the Journal Entry's series. Pin the same value server-side. */
const JE_NAMING_SERIES = "ACC-JV-.YYYY.-";

export async function createJournalTemplate(input: JournalTemplateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Colossal Journal Entry Template",
    template_title: input.templateTitle,
    voucher_type: input.voucherType,
    company: input.company,
    naming_series: JE_NAMING_SERIES,
    accounts: input.accounts.map((a) => ({
      account: a.account,
      debit_in_account_currency: a.debit,
      credit_in_account_currency: a.credit,
      cost_center: a.costCenter || undefined,
    })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateJournalTemplate(name: string, input: JournalTemplateInput): Promise<void> {
  // frappe.client.set_value with a dict fieldname and partial
  // frappe.client.save payloads both 417 on this build — fetch the
  // full doc, merge the edits, save it back whole.
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Colossal Journal Entry Template", name },
  });
  doc.template_title = input.templateTitle;
  doc.voucher_type = input.voucherType;
  doc.company = input.company;
  if (!doc.naming_series) doc.naming_series = JE_NAMING_SERIES;
  doc.accounts = input.accounts.map((a) => ({
    account: a.account,
    debit_in_account_currency: a.debit,
    credit_in_account_currency: a.credit,
    cost_center: a.costCenter || undefined,
  }));
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc },
  });
}

export async function deleteJournalTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Colossal Journal Entry Template", name },
  });
}
