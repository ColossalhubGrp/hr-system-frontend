import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** Customer Group master — a bucket customers belong to (Retail, Wholesale, etc.). */

export type CustomerGroup = {
  name: string;
  customerGroupName: string;
  parent: string | null;
  isGroup: boolean;
};

export async function listCustomerGroups(): Promise<CustomerGroup[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Customer Group",
      fields: ["name", "customer_group_name", "parent_customer_group", "is_group"],
      order_by: "customer_group_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    customerGroupName: String(r.customer_group_name ?? r.name ?? ""),
    parent: (r.parent_customer_group as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
  }));
}

export async function getCustomerGroup(name: string): Promise<CustomerGroup | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Customer Group", name },
    });
    return {
      name: String(doc.name ?? name),
      customerGroupName: String(doc.customer_group_name ?? doc.name ?? ""),
      parent: (doc.parent_customer_group as string | null) ?? null,
      isGroup: Number(doc.is_group ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CustomerGroupInput = {
  customerGroupName: string;
  parent?: string;
  isGroup: boolean;
};

export async function createCustomerGroup(input: CustomerGroupInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Customer Group",
        customer_group_name: input.customerGroupName,
        parent_customer_group: input.parent || undefined,
        is_group: input.isGroup ? 1 : 0,
      },
    },
  });
  return { name: created.name };
}

export async function updateCustomerGroup(name: string, input: CustomerGroupInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Customer Group",
      name,
      fieldname: {
        customer_group_name: input.customerGroupName,
        parent_customer_group: input.parent || null,
        is_group: input.isGroup ? 1 : 0,
      },
    },
  });
}

export async function deleteCustomerGroup(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Customer Group", name },
  });
}
