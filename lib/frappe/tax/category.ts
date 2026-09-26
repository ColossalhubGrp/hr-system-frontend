import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Tax Category" — a bucket that lets Tax Rules pick the right tax template per party/region. */

export type TaxCategory = { name: string; title: string; disabled: boolean };

export async function listTaxCategories(): Promise<TaxCategory[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Tax Category",
      fields: ["name", "title", "disabled"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    disabled: Number(r.disabled ?? 0) === 1,
  }));
}

export async function getTaxCategory(name: string): Promise<TaxCategory | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Tax Category", name },
    });
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function createTaxCategory(input: { title: string; disabled: boolean }): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Tax Category", title: input.title, disabled: input.disabled ? 1 : 0 } },
  });
  return { name: created.name };
}

export async function updateTaxCategory(name: string, input: { title: string; disabled: boolean }): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Tax Category",
      name,
      fieldname: { title: input.title, disabled: input.disabled ? 1 : 0 },
    },
  });
}

export async function deleteTaxCategory(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Tax Category", name },
  });
}
