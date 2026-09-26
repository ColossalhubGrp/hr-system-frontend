import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/** Supplier Group master — a bucket suppliers belong to (Materials, Services, Utilities…). */

export type SupplierGroup = {
  name: string;
  supplierGroupName: string;
  parent: string | null;
  isGroup: boolean;
};

export async function listSupplierGroups(): Promise<SupplierGroup[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Supplier Group",
      fields: ["name", "supplier_group_name", "parent_supplier_group", "is_group"],
      order_by: "supplier_group_name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    supplierGroupName: String(r.supplier_group_name ?? r.name ?? ""),
    parent: (r.parent_supplier_group as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
  }));
}

export async function getSupplierGroup(name: string): Promise<SupplierGroup | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Supplier Group", name },
    });
    return {
      name: String(doc.name ?? name),
      supplierGroupName: String(doc.supplier_group_name ?? doc.name ?? ""),
      parent: (doc.parent_supplier_group as string | null) ?? null,
      isGroup: Number(doc.is_group ?? 0) === 1,
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type SupplierGroupInput = {
  supplierGroupName: string;
  parent?: string;
  isGroup: boolean;
};

export async function createSupplierGroup(input: SupplierGroupInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Supplier Group",
        supplier_group_name: input.supplierGroupName,
        parent_supplier_group: input.parent || undefined,
        is_group: input.isGroup ? 1 : 0,
      },
    },
  });
  return { name: created.name };
}

export async function updateSupplierGroup(name: string, input: SupplierGroupInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Supplier Group",
      name,
      fieldname: {
        supplier_group_name: input.supplierGroupName,
        parent_supplier_group: input.parent || null,
        is_group: input.isGroup ? 1 : 0,
      },
    },
  });
}

export async function deleteSupplierGroup(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Supplier Group", name },
  });
}
