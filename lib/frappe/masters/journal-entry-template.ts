import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Journal Entry Template" master — a saved template of an
 * accounts child table + voucher type. Speeds up recurring postings
 * (payroll runs, month-end accruals, etc.).
 */

export const VOUCHER_TYPES = [
  "Journal Entry",
  "Inter Company Journal Entry",
  "Bank Entry",
  "Cash Entry",
  "Credit Card Entry",
  "Debit Note",
  "Credit Note",
  "Contra Entry",
  "Excise Entry",
  "Write Off Entry",
  "Opening Entry",
  "Depreciation Entry",
  "Exchange Rate Revaluation",
  "Deferred Revenue",
  "Deferred Expense",
] as const;

export type JournalEntryTemplate = {
  name: string;
  templateTitle: string;
  voucherType: string;
  company: string | null;
  isSystemGenerated: boolean;
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
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Journal Entry Template",
      fields: ["name", "template_title", "voucher_type", "company", "is_system_generated"],
      order_by: "template_title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    templateTitle: String(r.template_title ?? r.name ?? ""),
    voucherType: String(r.voucher_type ?? "Journal Entry"),
    company: (r.company as string | null) ?? null,
    isSystemGenerated: Number(r.is_system_generated ?? 0) === 1,
  }));
}

export async function getJournalTemplate(name: string): Promise<JournalEntryTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Journal Entry Template", name },
    });
    const accounts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      templateTitle: String(doc.template_title ?? doc.name ?? ""),
      voucherType: String(doc.voucher_type ?? "Journal Entry"),
      company: (doc.company as string | null) ?? null,
      isSystemGenerated: Number(doc.is_system_generated ?? 0) === 1,
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
  company?: string;
  accounts: Array<{ account: string; debit: number; credit: number; costCenter?: string }>;
};

export async function createJournalTemplate(input: JournalTemplateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Journal Entry Template",
    template_title: input.templateTitle,
    voucher_type: input.voucherType,
    company: input.company || undefined,
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
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Journal Entry Template",
      name,
      fieldname: {
        template_title: input.templateTitle,
        voucher_type: input.voucherType,
        company: input.company || null,
      },
    },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Journal Entry Template",
        name,
        accounts: input.accounts.map((a) => ({
          account: a.account,
          debit_in_account_currency: a.debit,
          credit_in_account_currency: a.credit,
          cost_center: a.costCenter || undefined,
        })),
      },
    },
  });
}

export async function deleteJournalTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Journal Entry Template", name },
  });
}
