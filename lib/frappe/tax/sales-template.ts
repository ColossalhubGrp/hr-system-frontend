import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
export { CHARGE_TYPES } from "./sales-template-constants";

/**
 * ERPNext "Sales Taxes and Charges Template" — the reusable tax block
 * applied to Sales Invoices, Quotes and Sales Orders.
 */

export type SalesTaxTemplate = {
  name: string;
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
};

export type SalesTaxLine = {
  idx: number;
  chargeType: string;
  accountHead: string;
  description: string;
  rate: number;
  costCenter: string | null;
  includedInPrintRate: boolean;
};

export type SalesTaxTemplateDetail = SalesTaxTemplate & { taxes: SalesTaxLine[] };

export async function listSalesTaxTemplates(): Promise<SalesTaxTemplate[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Sales Taxes and Charges Template",
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

export async function getSalesTaxTemplate(name: string): Promise<SalesTaxTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Sales Taxes and Charges Template", name },
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
        costCenter: (r.cost_center as string | null) ?? null,
        includedInPrintRate: Number(r.included_in_print_rate ?? 0) === 1,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SalesTaxTemplateInput = {
  title: string;
  company: string;
  isDefault: boolean;
  disabled: boolean;
  taxes: Array<{ chargeType: string; accountHead: string; description: string; rate: number; costCenter?: string; includedInPrintRate: boolean }>;
};

export async function createSalesTaxTemplate(input: SalesTaxTemplateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Sales Taxes and Charges Template",
    title: input.title,
    company: input.company,
    is_default: input.isDefault ? 1 : 0,
    disabled: input.disabled ? 1 : 0,
    taxes: input.taxes.map((t) => ({
      charge_type: t.chargeType,
      account_head: t.accountHead,
      description: t.description,
      rate: t.rate,
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

export async function updateSalesTaxTemplate(name: string, input: SalesTaxTemplateInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Sales Taxes and Charges Template",
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
        doctype: "Sales Taxes and Charges Template",
        name,
        taxes: input.taxes.map((t) => ({
          charge_type: t.chargeType,
          account_head: t.accountHead,
          description: t.description,
          rate: t.rate,
          cost_center: t.costCenter || undefined,
          included_in_print_rate: t.includedInPrintRate ? 1 : 0,
        })),
      },
    },
  });
}

export async function deleteSalesTaxTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Sales Taxes and Charges Template", name },
  });
}
