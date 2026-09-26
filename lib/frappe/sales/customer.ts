import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * Customer master — the party we sell to. Sales Invoice, Payment Entry
 * (Receive) and the Opening Invoice tool all pick from this list.
 */

export type CustomerRow = {
  name: string;
  customerName: string;
  customerType: string;
  customerGroup: string | null;
  territory: string | null;
  defaultCurrency: string | null;
  taxId: string | null;
};

export type CustomerDetail = CustomerRow & {
  paymentTerms: string | null;
  defaultPriceList: string | null;
  taxCategory: string | null;
  language: string | null;
  websiteUrl: string | null;
  marketSegment: string | null;
  industry: string | null;
};

export async function listCustomers(opts: { search?: string; limit?: number } = {}): Promise<CustomerRow[]> {
  const limit = Math.min(200, opts.limit ?? 100);
  // `disabled` isn't queryable via get_list on Customer under Frappe v15's
  // field-permission check -- filtering on it 417s.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["customer_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Customer",
      fields: [
        "name",
        "customer_name",
        "customer_type",
        "customer_group",
        "territory",
        "default_currency",
        "tax_id",
      ],
      filters,
      order_by: "customer_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    customerName: String(r.customer_name ?? r.name ?? ""),
    customerType: String(r.customer_type ?? "Company"),
    customerGroup: (r.customer_group as string | null) ?? null,
    territory: (r.territory as string | null) ?? null,
    defaultCurrency: (r.default_currency as string | null) ?? null,
    taxId: (r.tax_id as string | null) ?? null,
  }));
}

export async function getCustomer(name: string): Promise<CustomerDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Customer", name },
    });
    return {
      name: String(doc.name ?? name),
      customerName: String(doc.customer_name ?? doc.name ?? ""),
      customerType: String(doc.customer_type ?? "Company"),
      customerGroup: (doc.customer_group as string | null) ?? null,
      territory: (doc.territory as string | null) ?? null,
      defaultCurrency: (doc.default_currency as string | null) ?? null,
      taxId: (doc.tax_id as string | null) ?? null,
      paymentTerms: (doc.payment_terms as string | null) ?? null,
      defaultPriceList: (doc.default_price_list as string | null) ?? null,
      taxCategory: (doc.tax_category as string | null) ?? null,
      language: (doc.language as string | null) ?? null,
      websiteUrl: (doc.website as string | null) ?? null,
      marketSegment: (doc.market_segment as string | null) ?? null,
      industry: (doc.industry as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CustomerInput = {
  customerName: string;
  customerType: string;
  customerGroup?: string;
  territory?: string;
  defaultCurrency?: string;
  taxId?: string;
  paymentTerms?: string;
  defaultPriceList?: string;
  taxCategory?: string;
  language?: string;
  websiteUrl?: string;
  marketSegment?: string;
  industry?: string;
};

function payload(input: CustomerInput): Record<string, unknown> {
  return {
    customer_name: input.customerName,
    customer_type: input.customerType,
    customer_group: input.customerGroup || null,
    territory: input.territory || null,
    default_currency: input.defaultCurrency || null,
    tax_id: input.taxId || null,
    payment_terms: input.paymentTerms || null,
    default_price_list: input.defaultPriceList || null,
    tax_category: input.taxCategory || null,
    language: input.language || null,
    website: input.websiteUrl || null,
    market_segment: input.marketSegment || null,
    industry: input.industry || null,
  };
}

export async function createCustomer(input: CustomerInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Customer", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateCustomer(name: string, input: CustomerInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Customer", name, fieldname: payload(input) },
  });
}

export async function deleteCustomer(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Customer", name },
  });
}

export async function listTerritories(): Promise<string[]> {
  try {
    const rows = await frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Territory",
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 0,
      },
    });
    return rows.map((r) => String(r.name ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}
