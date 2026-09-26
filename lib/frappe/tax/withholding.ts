import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Tax Withholding Category" — the master for WHT/TDS rates,
 * account heads, and thresholds. Applied against a supplier so the
 * right amount is withheld at payment time.
 */

export type TaxWithholdingCategory = {
  name: string;
  category: string;
  roundOff: boolean;
  considerPartyLedgerAmount: boolean;
};

export type WithholdingRate = {
  idx: number;
  fromDate: string;
  toDate: string;
  taxWithholdingRate: number;
  singleThreshold: number;
  cumulativeThreshold: number;
};

export type WithholdingAccount = {
  idx: number;
  company: string;
  account: string;
};

export type TaxWithholdingDetail = TaxWithholdingCategory & {
  rates: WithholdingRate[];
  accounts: WithholdingAccount[];
};

export async function listTaxWithholding(): Promise<TaxWithholdingCategory[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Tax Withholding Category",
      fields: ["name", "category_name", "round_off_tax_amount", "consider_party_ledger_amount"],
      order_by: "category_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    category: String(r.category_name ?? r.name ?? ""),
    roundOff: Number(r.round_off_tax_amount ?? 0) === 1,
    considerPartyLedgerAmount: Number(r.consider_party_ledger_amount ?? 0) === 1,
  }));
}

export async function getTaxWithholding(name: string): Promise<TaxWithholdingDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Tax Withholding Category", name },
    });
    const rates = (doc.rates as Array<Record<string, unknown>>) ?? [];
    const accounts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      category: String(doc.category_name ?? doc.name ?? ""),
      roundOff: Number(doc.round_off_tax_amount ?? 0) === 1,
      considerPartyLedgerAmount: Number(doc.consider_party_ledger_amount ?? 0) === 1,
      rates: rates.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        fromDate: String(r.from_date ?? ""),
        toDate: String(r.to_date ?? ""),
        taxWithholdingRate: Number(r.tax_withholding_rate ?? 0),
        singleThreshold: Number(r.single_threshold ?? 0),
        cumulativeThreshold: Number(r.cumulative_threshold ?? 0),
      })),
      accounts: accounts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        company: String(r.company ?? ""),
        account: String(r.account ?? ""),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type TaxWithholdingInput = {
  category: string;
  roundOff: boolean;
  considerPartyLedgerAmount: boolean;
  rates: Array<{ fromDate: string; toDate: string; taxWithholdingRate: number; singleThreshold: number; cumulativeThreshold: number }>;
  accounts: Array<{ company: string; account: string }>;
};

export async function createTaxWithholding(input: TaxWithholdingInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Tax Withholding Category",
    category_name: input.category,
    round_off_tax_amount: input.roundOff ? 1 : 0,
    consider_party_ledger_amount: input.considerPartyLedgerAmount ? 1 : 0,
    rates: input.rates.map((r) => ({
      from_date: r.fromDate,
      to_date: r.toDate,
      tax_withholding_rate: r.taxWithholdingRate,
      single_threshold: r.singleThreshold,
      cumulative_threshold: r.cumulativeThreshold,
    })),
    accounts: input.accounts.map((a) => ({ company: a.company, account: a.account })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateTaxWithholding(name: string, input: TaxWithholdingInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Tax Withholding Category",
      name,
      fieldname: {
        category_name: input.category,
        round_off_tax_amount: input.roundOff ? 1 : 0,
        consider_party_ledger_amount: input.considerPartyLedgerAmount ? 1 : 0,
      },
    },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Tax Withholding Category",
        name,
        rates: input.rates.map((r) => ({
          from_date: r.fromDate,
          to_date: r.toDate,
          tax_withholding_rate: r.taxWithholdingRate,
          single_threshold: r.singleThreshold,
          cumulative_threshold: r.cumulativeThreshold,
        })),
        accounts: input.accounts.map((a) => ({ company: a.company, account: a.account })),
      },
    },
  });
}

export async function deleteTaxWithholding(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Tax Withholding Category", name },
  });
}
