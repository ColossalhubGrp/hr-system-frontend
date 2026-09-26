import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Finance Book" master — parallel books of account (statutory
 * vs management, IFRS vs local GAAP, etc.). Journal Entries and GL
 * postings can tag a book.
 */

export type FinanceBook = {
  name: string;
  financeBookName: string;
};

export async function listFinanceBooks(): Promise<FinanceBook[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Finance Book",
      fields: ["name", "finance_book_name"],
      order_by: "finance_book_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    financeBookName: String(r.finance_book_name ?? r.name ?? ""),
  }));
}

export async function getFinanceBook(name: string): Promise<FinanceBook | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Finance Book", name },
    });
    return { name: String(doc.name ?? name), financeBookName: String(doc.finance_book_name ?? doc.name ?? "") };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function createFinanceBook(input: { financeBookName: string }): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Finance Book", finance_book_name: input.financeBookName } },
  });
  return { name: created.name };
}

export async function updateFinanceBook(name: string, input: { financeBookName: string }): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Finance Book",
      name,
      fieldname: { finance_book_name: input.financeBookName },
    },
  });
}

export async function deleteFinanceBook(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Finance Book", name },
  });
}
