import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * Supplier master — the party we buy from. Purchase Invoice, Payment
 * Entry (Pay) and the Opening Invoice tool all pick from this list.
 */

export type SupplierRow = {
  name: string;
  supplierName: string;
  supplierType: string;
  supplierGroup: string | null;
  country: string | null;
  defaultCurrency: string | null;
  taxId: string | null;
};

export type SupplierDetail = SupplierRow & {
  paymentTerms: string | null;
  defaultPriceList: string | null;
  taxCategory: string | null;
  language: string | null;
  websiteUrl: string | null;
  holdType: string | null;
  releaseDate: string | null;
};

import { HOLD_TYPES } from "./supplier-constants";
export type HoldType = (typeof HOLD_TYPES)[number];

export async function listSuppliersDirectory(opts: { search?: string; limit?: number } = {}): Promise<SupplierRow[]> {
  const limit = Math.min(200, opts.limit ?? 100);
  // `disabled` not queryable on Supplier under Frappe v15 field-permission
  // check -- would 417 the whole page.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["supplier_name", "like", `%${opts.search}%`]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Supplier",
      fields: [
        "name",
        "supplier_name",
        "supplier_type",
        "supplier_group",
        "country",
        "default_currency",
        "tax_id",
      ],
      filters,
      order_by: "supplier_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    supplierName: String(r.supplier_name ?? r.name ?? ""),
    supplierType: String(r.supplier_type ?? "Company"),
    supplierGroup: (r.supplier_group as string | null) ?? null,
    country: (r.country as string | null) ?? null,
    defaultCurrency: (r.default_currency as string | null) ?? null,
    taxId: (r.tax_id as string | null) ?? null,
  }));
}

export async function getSupplier(name: string): Promise<SupplierDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Supplier", name },
    });
    return {
      name: String(doc.name ?? name),
      supplierName: String(doc.supplier_name ?? doc.name ?? ""),
      supplierType: String(doc.supplier_type ?? "Company"),
      supplierGroup: (doc.supplier_group as string | null) ?? null,
      country: (doc.country as string | null) ?? null,
      defaultCurrency: (doc.default_currency as string | null) ?? null,
      taxId: (doc.tax_id as string | null) ?? null,
      paymentTerms: (doc.payment_terms as string | null) ?? null,
      defaultPriceList: (doc.default_price_list as string | null) ?? null,
      taxCategory: (doc.tax_category as string | null) ?? null,
      language: (doc.language as string | null) ?? null,
      websiteUrl: (doc.website as string | null) ?? null,
      holdType: (doc.hold_type as string | null) ?? null,
      releaseDate: (doc.release_date as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SupplierInput = {
  supplierName: string;
  supplierType: string;
  supplierGroup?: string;
  country?: string;
  defaultCurrency?: string;
  taxId?: string;
  paymentTerms?: string;
  defaultPriceList?: string;
  taxCategory?: string;
  language?: string;
  websiteUrl?: string;
  holdType?: string;
  releaseDate?: string;
};

function payload(input: SupplierInput): Record<string, unknown> {
  return {
    supplier_name: input.supplierName,
    supplier_type: input.supplierType,
    supplier_group: input.supplierGroup || null,
    country: input.country || null,
    default_currency: input.defaultCurrency || null,
    tax_id: input.taxId || null,
    payment_terms: input.paymentTerms || null,
    default_price_list: input.defaultPriceList || null,
    tax_category: input.taxCategory || null,
    language: input.language || null,
    website: input.websiteUrl || null,
    hold_type: input.holdType || null,
    release_date: input.releaseDate || null,
  };
}

export async function createSupplierDirectory(input: SupplierInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Supplier", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateSupplier(name: string, input: SupplierInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Supplier", name, fieldname: payload(input) },
  });
}

export async function deleteSupplier(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Supplier", name },
  });
}

export { HOLD_TYPES };

