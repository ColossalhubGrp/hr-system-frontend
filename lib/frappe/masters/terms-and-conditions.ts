import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Terms and Conditions" master — reusable legal text blocks
 * printed on quotes, orders, invoices, etc.
 */

export type TermsAndConditions = {
  name: string;
  title: string;
  disabled: boolean;
  modified: string;
};

export type TermsDetail = TermsAndConditions & {
  terms: string;
};

export async function listTerms(): Promise<TermsAndConditions[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Terms and Conditions",
      fields: ["name", "title", "disabled", "modified"],
      order_by: "title asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    title: String(r.title ?? r.name ?? ""),
    disabled: Number(r.disabled ?? 0) === 1,
    modified: String(r.modified ?? ""),
  }));
}

export async function getTerms(name: string): Promise<TermsDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Terms and Conditions", name },
    });
    return {
      name: String(doc.name ?? name),
      title: String(doc.title ?? doc.name ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
      modified: String(doc.modified ?? ""),
      terms: String(doc.terms ?? ""),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type TermsInput = {
  title: string;
  disabled: boolean;
  terms: string;
};

export async function createTerms(input: TermsInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Terms and Conditions",
    title: input.title,
    disabled: input.disabled ? 1 : 0,
    terms: input.terms,
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateTerms(name: string, input: TermsInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Terms and Conditions",
      name,
      fieldname: {
        title: input.title,
        disabled: input.disabled ? 1 : 0,
        terms: input.terms,
      },
    },
  });
}

export async function deleteTerms(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Terms and Conditions", name },
  });
}
