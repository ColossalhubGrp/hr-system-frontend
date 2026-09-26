import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Exchange Rate Revaluation" — periodic FX revaluation of
 * foreign-currency GL balances. Posts a Journal Entry recording the
 * unrealized gain/loss.
 */

export type Revaluation = {
  name: string;
  company: string;
  postingDate: string;
  gainLossAccount: string;
  docstatus: 0 | 1 | 2;
  totalGainLoss: number;
};

export type RevaluationAccount = {
  idx: number;
  account: string;
  partyType: string | null;
  party: string | null;
  accountCurrency: string;
  balanceInAccountCurrency: number;
  currentExchangeRate: number;
  newExchangeRate: number;
  balanceInBaseCurrency: number;
  newBalanceInBaseCurrency: number;
  gainLoss: number;
};

export type RevaluationDetail = Revaluation & {
  roundingLossAllowance: number;
  accounts: RevaluationAccount[];
};

export async function listRevaluations(): Promise<Revaluation[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Exchange Rate Revaluation",
      fields: ["name", "company", "posting_date", "gain_loss_account", "docstatus", "total_gain_loss"],
      order_by: "posting_date desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    company: String(r.company ?? ""),
    postingDate: String(r.posting_date ?? ""),
    gainLossAccount: String(r.gain_loss_account ?? ""),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
    totalGainLoss: Number(r.total_gain_loss ?? 0),
  }));
}

export async function getRevaluation(name: string): Promise<RevaluationDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Exchange Rate Revaluation", name },
    });
    const accts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      company: String(doc.company ?? ""),
      postingDate: String(doc.posting_date ?? ""),
      gainLossAccount: String(doc.gain_loss_account ?? ""),
      roundingLossAllowance: Number(doc.rounding_loss_allowance ?? 0),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      totalGainLoss: Number(doc.total_gain_loss ?? 0),
      accounts: accts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        account: String(r.account ?? ""),
        partyType: (r.party_type as string | null) ?? null,
        party: (r.party as string | null) ?? null,
        accountCurrency: String(r.account_currency ?? ""),
        balanceInAccountCurrency: Number(r.balance_in_account_currency ?? 0),
        currentExchangeRate: Number(r.current_exchange_rate ?? 0),
        newExchangeRate: Number(r.new_exchange_rate ?? 0),
        balanceInBaseCurrency: Number(r.balance_in_base_currency ?? 0),
        newBalanceInBaseCurrency: Number(r.new_balance_in_base_currency ?? 0),
        gainLoss: Number(r.gain_loss ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function createRevaluation(input: { company: string; postingDate: string; gainLossAccount: string; roundingLossAllowance: number }): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Exchange Rate Revaluation",
        company: input.company,
        posting_date: input.postingDate,
        gain_loss_account: input.gainLossAccount,
        rounding_loss_allowance: input.roundingLossAllowance,
      },
    },
  });
  return { name: created.name };
}

export async function fetchRevaluationBalances(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.run_doc_method",
    as: "user",
    verb: "POST",
    args: {
      dt: "Exchange Rate Revaluation",
      dn: name,
      method: "get_accounts_data",
    },
  });
}

export async function submitRevaluation(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Exchange Rate Revaluation", name } },
  });
}

export async function cancelRevaluation(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Exchange Rate Revaluation", name },
  });
}

export async function deleteRevaluation(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Exchange Rate Revaluation", name },
  });
}
