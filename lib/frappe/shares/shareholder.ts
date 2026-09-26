import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Shareholder" master. */

export type Shareholder = {
  name: string;
  title: string;
  folioNo: string | null;
  company: string;
};

export async function listShareholders(): Promise<Shareholder[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Shareholder",
      fields: ["name", "title", "folio_no", "company"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    folioNo: (r.folio_no as string | null) ?? null,
    company: String(r.company ?? ""),
  }));
}

export async function getShareholder(name: string): Promise<Shareholder | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Shareholder", name },
    });
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      folioNo: (doc.folio_no as string | null) ?? null,
      company: String(doc.company ?? ""),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type ShareholderInput = { title: string; folioNo?: string; company: string };

export async function createShareholder(input: ShareholderInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Shareholder", title: input.title, folio_no: input.folioNo || undefined, company: input.company } },
  });
  return { name: created.name };
}

export async function updateShareholder(name: string, input: ShareholderInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Shareholder", name, fieldname: { title: input.title, folio_no: input.folioNo || null, company: input.company } },
  });
}

export async function deleteShareholder(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Shareholder", name },
  });
}
