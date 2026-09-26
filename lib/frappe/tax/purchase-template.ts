import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
export { CHARGE_TYPES, CATEGORY, ADD_DEDUCT } from "./purchase-template-constants";

/**
 * ERPNext "Purchase Taxes and Charges Template" — mirror of the sales
 * template, applied to Purchase Invoices, Purchase Orders and RFQ.
 */

export type PurchaseTaxTemplate = {
  name: string;
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
};

export type PurchaseTaxLine = {
  idx: number;
  chargeType: string;
  accountHead: string;
  description: string;
  rate: number;
  category: string;
  addDeductTax: string;
  costCenter: string | null;
  includedInPrintRate: boolean;
};

export type PurchaseTaxTemplateDetail = PurchaseTaxTemplate & { taxes: PurchaseTaxLine[] };

export async function listPurchaseTaxTemplates(): Promise<PurchaseTaxTemplate[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Purchase Taxes and Charges Template",
      fields: ["name", "title", "company", "is_default", "disabled"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    company: String(r.company ?? ""),
    isDefault: Number(r.is_default ?? 0) === 1,
    disabled: Number(r.disabled ?? 0) === 1,
  }));
}

export async function getPurchaseTaxTemplate(name: string): Promise<PurchaseTaxTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Purchase Taxes and Charges Template", name },
    });
    const taxes = (doc.taxes as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      company: String(doc.company ?? ""),
      isDefault: Number(doc.is_default ?? 0) === 1,
      disabled: Number(doc.disabled ?? 0) === 1,
      taxes: taxes.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        chargeType: String(r.charge_type ?? ""),
        accountHead: String(r.account_head ?? ""),
        description: String(r.description ?? ""),
        rate: Number(r.rate ?? 0),
        category: String(r.category ?? "Total"),
        addDeductTax: String(r.add_deduct_tax ?? "Add"),
        costCenter: (r.cost_center as string | null) ?? null,
        includedInPrintRate: Number(r.included_in_print_rate ?? 0) === 1,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type PurchaseTaxTemplateInput = {
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
  taxes: Array<{
    chargeType: string;
    accountHead: string;
    description: string;
    rate: number;
    category: string;
    addDeductTax: string;
    costCenter?: string;
    includedInPrintRate: boolean;
  }>;
};

export async function createPurchaseTaxTemplate(input: PurchaseTaxTemplateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Purchase Taxes and Charges Template",
    title: input.title,
    company: input.company,
    is_default: input.isDefault ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    taxes: input.taxes.map((t) => ({
      charge_type: t.chargeType,
      account_head: t.accountHead,
      description: t.description,
      rate: t.rate,
      category: t.category,
      add_deduct_tax: t.addDeductTax,
      cost_center: t.costCenter || undefined,
      included_in_print_rate: t.includedInPrintRate ? 1 : 0,
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

export async function updatePurchaseTaxTemplate(name: string, input: PurchaseTaxTemplateInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Purchase Taxes and Charges Template",
      name,
      fieldname: {
        title: input.title,
        company: input.company,
        is_default: input.isDefault ? 1 : 0,
        disabled: input.disabled ? 1 : 0,
      },
    },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Purchase Taxes and Charges Template",
        name,
        taxes: input.taxes.map((t) => ({
          charge_type: t.chargeType,
          account_head: t.accountHead,
          description: t.description,
          rate: t.rate,
          category: t.category,
          add_deduct_tax: t.addDeductTax,
          cost_center: t.costCenter || undefined,
          included_in_print_rate: t.includedInPrintRate ? 1 : 0,
        })),
      },
    },
  });
}

export async function deletePurchaseTaxTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Purchase Taxes and Charges Template", name },
  });
}
