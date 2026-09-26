import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Item Tax Template" — overrides the sales/purchase tax rate for a specific item. */

export type ItemTaxTemplate = {
  name: string;
  title: string;
  company: string;
  disabled: boolean;
};

export type ItemTaxRow = { idx: number; taxType: string; taxRate: number };

export type ItemTaxTemplateDetail = ItemTaxTemplate & { taxes: ItemTaxRow[] };

export async function listItemTaxTemplates(): Promise<ItemTaxTemplate[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Item Tax Template",
      fields: ["name", "title", "company", "disabled"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    company: String(r.company ?? ""),
    disabled: Number(r.disabled ?? 0) === 1,
  }));
}

export async function getItemTaxTemplate(name: string): Promise<ItemTaxTemplateDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Item Tax Template", name },
    });
    const taxes = (doc.taxes as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      company: String(doc.company ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
      taxes: taxes.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        taxType: String(r.tax_type ?? ""),
        taxRate: Number(r.tax_rate ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type ItemTaxTemplateInput = {
  title: string;
  company: string;
  disabled: boolean;
  taxes: Array<{ taxType: string; taxRate: number }>;
};

export async function createItemTaxTemplate(input: ItemTaxTemplateInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Item Tax Template",
    title: input.title,
    company: input.company,
    disabled: input.disabled ? 1 : 0,
    taxes: input.taxes.map((t) => ({ tax_type: t.taxType, tax_rate: t.taxRate })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateItemTaxTemplate(name: string, input: ItemTaxTemplateInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Item Tax Template",
      name,
      fieldname: {
        title: input.title,
        company: input.company,
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
        doctype: "Item Tax Template",
        name,
        taxes: input.taxes.map((t) => ({ tax_type: t.taxType, tax_rate: t.taxRate })),
      },
    },
  });
}

export async function deleteItemTaxTemplate(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Item Tax Template", name },
  });
}
