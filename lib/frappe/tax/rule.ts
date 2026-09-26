import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Tax Rule" — routes an invoice to the right tax template
 * based on party, party group, item, item group, tax category, or
 * shipping/billing geography.
 */

export type TaxRuleRow = {
  name: string;
  taxType: string;
  taxCategory: string | null;
  salesTaxTemplate: string | null;
  purchaseTaxTemplate: string | null;
  customer: string | null;
  supplier: string | null;
  priority: number;
  useForShoppingCart: boolean;
  fromDate: string | null;
  toDate: string | null;
};

export type TaxRuleDetail = TaxRuleRow & {
  customerGroup: string | null;
  supplierGroup: string | null;
  item: string | null;
  itemGroup: string | null;
  billingCity: string | null;
  billingCounty: string | null;
  billingState: string | null;
  billingZipcode: string | null;
  billingCountry: string | null;
  shippingCity: string | null;
  shippingCounty: string | null;
  shippingState: string | null;
  shippingZipcode: string | null;
  shippingCountry: string | null;
};

export async function listTaxRules(): Promise<TaxRuleRow[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Tax Rule",
      fields: [
        "name", "tax_type", "tax_category", "sales_tax_template",
        "purchase_tax_template", "customer", "supplier", "priority",
        "use_for_shopping_cart", "from_date", "to_date",
      ],
      order_by: "priority desc, creation desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    taxType: String(r.tax_type ?? "Sales"),
    taxCategory: (r.tax_category as string | null) ?? null,
    salesTaxTemplate: (r.sales_tax_template as string | null) ?? null,
    purchaseTaxTemplate: (r.purchase_tax_template as string | null) ?? null,
    customer: (r.customer as string | null) ?? null,
    supplier: (r.supplier as string | null) ?? null,
    priority: Number(r.priority ?? 0),
    useForShoppingCart: Number(r.use_for_shopping_cart ?? 0) === 1,
    fromDate: (r.from_date as string | null) ?? null,
    toDate: (r.to_date as string | null) ?? null,
  }));
}

export async function getTaxRule(name: string): Promise<TaxRuleDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Tax Rule", name },
    });
    return {
      name: String(doc.name ?? name),
      taxType: String(doc.tax_type ?? "Sales"),
      taxCategory: (doc.tax_category as string | null) ?? null,
      salesTaxTemplate: (doc.sales_tax_template as string | null) ?? null,
      purchaseTaxTemplate: (doc.purchase_tax_template as string | null) ?? null,
      customer: (doc.customer as string | null) ?? null,
      supplier: (doc.supplier as string | null) ?? null,
      customerGroup: (doc.customer_group as string | null) ?? null,
      supplierGroup: (doc.supplier_group as string | null) ?? null,
      item: (doc.item as string | null) ?? null,
      itemGroup: (doc.item_group as string | null) ?? null,
      priority: Number(doc.priority ?? 0),
      useForShoppingCart: Number(doc.use_for_shopping_cart ?? 0) === 1,
      fromDate: (doc.from_date as string | null) ?? null,
      toDate: (doc.to_date as string | null) ?? null,
      billingCity: (doc.billing_city as string | null) ?? null,
      billingCounty: (doc.billing_county as string | null) ?? null,
      billingState: (doc.billing_state as string | null) ?? null,
      billingZipcode: (doc.billing_zipcode as string | null) ?? null,
      billingCountry: (doc.billing_country as string | null) ?? null,
      shippingCity: (doc.shipping_city as string | null) ?? null,
      shippingCounty: (doc.shipping_county as string | null) ?? null,
      shippingState: (doc.shipping_state as string | null) ?? null,
      shippingZipcode: (doc.shipping_zipcode as string | null) ?? null,
      shippingCountry: (doc.shipping_country as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type TaxRuleInput = {
  taxType: "Sales" | "Purchase";
  taxCategory?: string;
  salesTaxTemplate?: string;
  purchaseTaxTemplate?: string;
  customer?: string;
  supplier?: string;
  customerGroup?: string;
  supplierGroup?: string;
  item?: string;
  itemGroup?: string;
  priority: number;
  useForShoppingCart: boolean;
  fromDate?: string;
  toDate?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
};

function payload(input: TaxRuleInput): Record<string, unknown> {
  return {
    tax_type: input.taxType,
    tax_category: input.taxCategory || null,
    sales_tax_template: input.taxType === "Sales" ? input.salesTaxTemplate || null : null,
    purchase_tax_template: input.taxType === "Purchase" ? input.purchaseTaxTemplate || null : null,
    customer: input.customer || null,
    supplier: input.supplier || null,
    customer_group: input.customerGroup || null,
    supplier_group: input.supplierGroup || null,
    item: input.item || null,
    item_group: input.itemGroup || null,
    priority: input.priority,
    use_for_shopping_cart: input.useForShoppingCart ? 1 : 0,
    from_date: input.fromDate || null,
    to_date: input.toDate || null,
    billing_city: input.billingCity || null,
    billing_state: input.billingState || null,
    billing_country: input.billingCountry || null,
    shipping_city: input.shippingCity || null,
    shipping_state: input.shippingState || null,
    shipping_country: input.shippingCountry || null,
  };
}

export async function createTaxRule(input: TaxRuleInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Tax Rule", ...payload(input) } },
  });
  return { name: created.name };
}

export async function updateTaxRule(name: string, input: TaxRuleInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Tax Rule", name, fieldname: payload(input) },
  });
}

export async function deleteTaxRule(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Tax Rule", name },
  });
}
