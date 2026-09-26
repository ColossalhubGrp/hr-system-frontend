import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** ERPNext "Bank" master — the institution (name/SWIFT/website), not the account. */

export type Bank = {
  name: string;
  bankName: string;
  swiftNumber: string | null;
  website: string | null;
};

export async function listBanks(): Promise<Bank[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Bank",
      fields: ["name", "bank_name", "swift_number", "website"],
      order_by: "bank_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    bankName: String(r.bank_name ?? r.name ?? ""),
    swiftNumber: (r.swift_number as string | null) ?? null,
    website: (r.website as string | null) ?? null,
  }));
}

export async function getBank(name: string): Promise<Bank | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Bank", name },
    });
    return {
      name: String(doc.name ?? name),
      bankName: String(doc.bank_name ?? doc.name ?? ""),
      swiftNumber: (doc.swift_number as string | null) ?? null,
      website: (doc.website as string | null) ?? null,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type BankInput = { bankName: string; swiftNumber?: string; website?: string };

export async function createBank(input: BankInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Bank", bank_name: input.bankName, swift_number: input.swiftNumber || undefined, website: input.website || undefined } },
  });
  return { name: created.name };
}

export async function updateBank(name: string, input: BankInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Bank", name, fieldname: { bank_name: input.bankName, swift_number: input.swiftNumber || null, website: input.website || null } },
  });
}

export async function deleteBank(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Bank", name },
  });
}
