import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Currency" — enabled currencies + symbol + format. */

export type Currency = {
  name: string;
  currencyName: string;
  symbol: string | null;
  fraction: string | null;
  fractionUnits: number;
  smallestCurrencyFractionValue: number;
  numberFormat: string | null;
  enabled: boolean;
};

export async function listCurrencies(): Promise<Currency[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Currency",
      fields: [
        "name", "currency_name", "symbol", "fraction", "fraction_units",
        "smallest_currency_fraction_value", "number_format", "enabled",
      ],
      order_by: "name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    currencyName: String(r.currency_name ?? r.name ?? ""),
    symbol: (r.symbol as string | null) ?? null,
    fraction: (r.fraction as string | null) ?? null,
    fractionUnits: Number(r.fraction_units ?? 0),
    smallestCurrencyFractionValue: Number(r.smallest_currency_fraction_value ?? 0),
    numberFormat: (r.number_format as string | null) ?? null,
    enabled: Number(r.enabled ?? 0) === 1,
  }));
}

export async function getCurrency(name: string): Promise<Currency | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Currency", name },
    });
    return {
      name: String(doc.name ?? name),
      currencyName: String(doc.currency_name ?? doc.name ?? ""),
      symbol: (doc.symbol as string | null) ?? null,
      fraction: (doc.fraction as string | null) ?? null,
      fractionUnits: Number(doc.fraction_units ?? 0),
      smallestCurrencyFractionValue: Number(doc.smallest_currency_fraction_value ?? 0),
      numberFormat: (doc.number_format as string | null) ?? null,
      enabled: Number(doc.enabled ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CurrencyInput = {
  currencyName: string;
  symbol?: string;
  fraction?: string;
  fractionUnits: number;
  smallestCurrencyFractionValue: number;
  numberFormat?: string;
  enabled: boolean;
};

function payload(input: CurrencyInput): Record<string, unknown> {
  return {
    currency_name: input.currencyName,
    symbol: input.symbol || null,
    fraction: input.fraction || null,
    fraction_units: input.fractionUnits,
    smallest_currency_fraction_value: input.smallestCurrencyFractionValue,
    number_format: input.numberFormat || null,
    enabled: input.enabled ? 1 : 0,
  };
}

export async function createCurrency(input: CurrencyInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Currency", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateCurrency(name: string, input: CurrencyInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Currency", name, fieldname: payload(input) },
  });
}

export async function deleteCurrency(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Currency", name },
  });
}
