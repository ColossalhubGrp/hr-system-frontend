import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Currency Exchange" — the FX rate on a date. */

export type CurrencyExchange = {
  name: string;
  date: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  forBuying: boolean;
  forSelling: boolean;
};

export async function listCurrencyExchanges(): Promise<CurrencyExchange[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Currency Exchange",
      fields: ["name", "date", "from_currency", "to_currency", "exchange_rate", "for_buying", "for_selling"],
      order_by: "date desc",
      limit_page_length: 500,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    date: String(r.date ?? ""),
    fromCurrency: String(r.from_currency ?? ""),
    toCurrency: String(r.to_currency ?? ""),
    exchangeRate: Number(r.exchange_rate ?? 0),
    forBuying: Number(r.for_buying ?? 0) === 1,
    forSelling: Number(r.for_selling ?? 0) === 1,
  }));
}

export async function getCurrencyExchange(name: string): Promise<CurrencyExchange | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Currency Exchange", name },
    });
    return {
      name: String(doc.name ?? name),
      date: String(doc.date ?? ""),
      fromCurrency: String(doc.from_currency ?? ""),
      toCurrency: String(doc.to_currency ?? ""),
      exchangeRate: Number(doc.exchange_rate ?? 0),
      forBuying: Number(doc.for_buying ?? 0) === 1,
      forSelling: Number(doc.for_selling ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CurrencyExchangeInput = {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  forBuying: boolean;
  forSelling: boolean;
};

function payload(input: CurrencyExchangeInput) {
  return {
    date: input.date,
    from_currency: input.fromCurrency,
    to_currency: input.toCurrency,
    exchange_rate: input.exchangeRate,
    for_buying: input.forBuying ? 1 : 0,
    for_selling: input.forSelling ? 1 : 0,
  };
}

export async function createCurrencyExchange(input: CurrencyExchangeInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Currency Exchange", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateCurrencyExchange(name: string, input: CurrencyExchangeInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Currency Exchange", name, fieldname: payload(input) },
  });
}

export async function deleteCurrencyExchange(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Currency Exchange", name },
  });
}
