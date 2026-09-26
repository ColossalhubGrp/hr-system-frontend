import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Bank Account" — an account number at a Bank, linked to a GL account. */

export type BankAccount = {
  name: string;
  accountName: string;
  bank: string;
  accountType: string | null;
  isDefault: boolean;
  isCompanyAccount: boolean;
  disabled: boolean;
  bankAccountNo: string | null;
  iban: string | null;
  company: string | null;
};

export type BankAccountDetail = BankAccount & {
  account: string | null;
  currency: string | null;
  partyType: string | null;
  party: string | null;
};

export async function listBankAccounts(): Promise<BankAccount[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Bank Account",
      // `disabled` not queryable via get_list under Frappe v15 field
      // permissions. Only fetched on the detail form.
      fields: [
        "name", "account_name", "bank", "account_type", "is_default",
        "is_company_account", "bank_account_no", "iban", "company",
      ],
      order_by: "account_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    accountName: String(r.account_name ?? r.name ?? ""),
    bank: String(r.bank ?? ""),
    accountType: (r.account_type as string | null) ?? null,
    isDefault: Number(r.is_default ?? 0) === 1,
    isCompanyAccount: Number(r.is_company_account ?? 0) === 1,
    disabled: false, // see fields comment above
    bankAccountNo: (r.bank_account_no as string | null) ?? null,
    iban: (r.iban as string | null) ?? null,
    company: (r.company as string | null) ?? null,
  }));
}

export async function getBankAccount(name: string): Promise<BankAccountDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Bank Account", name },
    });
    return {
      name: String(doc.name ?? name),
      accountName: String(doc.account_name ?? doc.name ?? ""),
      bank: String(doc.bank ?? ""),
      accountType: (doc.account_type as string | null) ?? null,
      isDefault: Number(doc.is_default ?? 0) === 1,
      isCompanyAccount: Number(doc.is_company_account ?? 0) === 1,
      disabled: Number(doc.disabled ?? 0) === 1,
      bankAccountNo: (doc.bank_account_no as string | null) ?? null,
      iban: (doc.iban as string | null) ?? null,
      company: (doc.company as string | null) ?? null,
      account: (doc.account as string | null) ?? null,
      currency: (doc.currency as string | null) ?? null,
      partyType: (doc.party_type as string | null) ?? null,
      party: (doc.party as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type BankAccountInput = {
  accountName: string;
  bank: string;
  accountType?: string;
  isDefault: boolean;
  isCompanyAccount: boolean;
  disabled: boolean;
  bankAccountNo?: string;
  iban?: string;
  company?: string;
  account?: string;
  currency?: string;
  partyType?: string;
  party?: string;
};

function payload(input: BankAccountInput): Record<string, unknown> {
  return {
    account_name: input.accountName,
    bank: input.bank,
    account_type: input.accountType || null,
    is_default: input.isDefault ? 1 : 0,
    is_company_account: input.isCompanyAccount ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    bank_account_no: input.bankAccountNo || null,
    iban: input.iban || null,
    company: input.isCompanyAccount ? input.company || null : null,
    account: input.isCompanyAccount ? input.account || null : null,
    currency: input.currency || null,
    party_type: input.isCompanyAccount ? null : input.partyType || null,
    party: input.isCompanyAccount ? null : input.party || null,
  };
}

export async function createBankAccount(input: BankAccountInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Bank Account", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateBankAccount(name: string, input: BankAccountInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Bank Account", name, fieldname: payload(input) },
  });
}

export async function deleteBankAccount(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Bank Account", name },
  });
}
