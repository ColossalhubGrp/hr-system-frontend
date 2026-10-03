import "server-only";
import { FrappeRequestError, frappeCall } from "./client";
import { submitDoc } from "./submit-doc";

/**
 * Item master — the catalog of products and services referenced by
 * Sales Invoice, Purchase Invoice, Stock Entry, etc. Not a submittable
 * doctype in ERPNext (no docstatus) — rows are created/updated/disabled
 * in place.
 *
 * This module exposes the fields a non-stock-manager user touches on
 * the Frappe desk Item form: basics + inventory flags + per-company
 * defaults for income/expense accounts. Rarely-used tabs (variants,
 * taxes template, suppliers, website) are omitted here — add fields
 * when a user asks for them, don't speculate.
 */

export type ItemRow = {
  name: string;
  itemCode: string;
  itemName: string;
  itemGroup: string | null;
  stockUom: string;
  standardRate: number;
  isStockItem: boolean;
  hasVariants: boolean;
  disabled: boolean;
};

export type ItemDefault = {
  company: string;
  defaultWarehouse: string | null;
  incomeAccount: string | null;
  expenseAccount: string | null;
};

export type ItemDetail = ItemRow & {
  description: string | null;
  image: string | null;
  openingStock: number;
  valuationRate: number;
  isFixedAsset: boolean;
  hasBatchNo: boolean;
  hasSerialNo: boolean;
  shelfLifeInDays: number;
  endOfLife: string | null;
  weightPerUnit: number;
  weightUom: string | null;
  itemDefaults: ItemDefault[];
};

export type ItemCreateInput = {
  itemCode: string;
  itemName: string;
  itemGroup: string;
  stockUom: string;
  standardRate: number;
  description?: string;
  image?: string;
  isStockItem: boolean;
  isFixedAsset?: boolean;
  hasVariants?: boolean;
  hasBatchNo?: boolean;
  hasSerialNo?: boolean;
  openingStock?: number;
  valuationRate?: number;
  shelfLifeInDays?: number;
  endOfLife?: string;
  weightPerUnit?: number;
  weightUom?: string;
  disabled?: boolean;
  itemDefaults?: ItemDefault[];
};

// ── List ─────────────────────────────────────────────────────────

export async function listItemsDirectory(opts: {
  search?: string;
  group?: string;
  limit?: number;
} = {}): Promise<ItemRow[]> {
  const limit = Math.min(500, opts.limit ?? 200);
  // `disabled` isn't in Item's queryable field allowlist on this
  // Frappe install for non-System Managers (417s). Pulled back as a
  // field and filtered client-side if needed.
  const filters: [string, string, unknown][] = [];
  if (opts.search) filters.push(["item_name", "like", `%${opts.search}%`]);
  if (opts.group) filters.push(["item_group", "=", opts.group]);
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Item",
      fields: [
        "name", "item_code", "item_name", "item_group",
        "stock_uom", "standard_rate", "is_stock_item",
        "has_variants", "disabled",
      ],
      filters,
      order_by: "item_name asc",
      limit_page_length: limit,
    },
  });
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): ItemRow {
  return {
    name: String(r.name ?? ""),
    itemCode: String(r.item_code ?? r.name ?? ""),
    itemName: String(r.item_name ?? r.name ?? ""),
    itemGroup: (r.item_group as string | null) ?? null,
    stockUom: String(r.stock_uom ?? "Nos"),
    standardRate: Number(r.standard_rate ?? 0),
    isStockItem: Number(r.is_stock_item ?? 0) === 1,
    hasVariants: Number(r.has_variants ?? 0) === 1,
    disabled: Number(r.disabled ?? 0) === 1,
  };
}

// ── Detail ───────────────────────────────────────────────────────

export async function getItem(name: string): Promise<ItemDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Item", name },
    });
    const defaults = (doc.item_defaults as Array<Record<string, unknown>>) ?? [];
    return {
      ...mapRow(doc),
      description: (doc.description as string | null) ?? null,
      image: (doc.image as string | null) ?? null,
      openingStock: Number(doc.opening_stock ?? 0),
      valuationRate: Number(doc.valuation_rate ?? 0),
      isFixedAsset: Number(doc.is_fixed_asset ?? 0) === 1,
      hasBatchNo: Number(doc.has_batch_no ?? 0) === 1,
      hasSerialNo: Number(doc.has_serial_no ?? 0) === 1,
      shelfLifeInDays: Number(doc.shelf_life_in_days ?? 0),
      endOfLife: (doc.end_of_life as string | null) ?? null,
      weightPerUnit: Number(doc.weight_per_unit ?? 0),
      weightUom: (doc.weight_uom as string | null) ?? null,
      itemDefaults: defaults.map((d) => ({
        company: String(d.company ?? ""),
        defaultWarehouse: (d.default_warehouse as string | null) ?? null,
        incomeAccount: (d.income_account as string | null) ?? null,
        expenseAccount: (d.expense_account as string | null) ?? null,
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

// ── Mutate ───────────────────────────────────────────────────────

function toDoc(input: ItemCreateInput): Record<string, unknown> {
  return {
    doctype: "Item",
    item_code: input.itemCode,
    item_name: input.itemName,
    item_group: input.itemGroup,
    stock_uom: input.stockUom,
    standard_rate: Number(input.standardRate ?? 0),
    description: input.description || null,
    image: input.image || null,
    is_stock_item: input.isStockItem ? 1 : 0,
    is_fixed_asset: input.isFixedAsset ? 1 : 0,
    has_variants: input.hasVariants ? 1 : 0,
    has_batch_no: input.hasBatchNo ? 1 : 0,
    has_serial_no: input.hasSerialNo ? 1 : 0,
    opening_stock: Number(input.openingStock ?? 0),
    valuation_rate: Number(input.valuationRate ?? 0),
    shelf_life_in_days: Number(input.shelfLifeInDays ?? 0),
    end_of_life: input.endOfLife || null,
    weight_per_unit: Number(input.weightPerUnit ?? 0),
    weight_uom: input.weightUom || null,
    disabled: input.disabled ? 1 : 0,
    item_defaults: (input.itemDefaults ?? [])
      .filter((d) => d.company)
      .map((d) => ({
        company: d.company,
        default_warehouse: d.defaultWarehouse || null,
        income_account: d.incomeAccount || null,
        expense_account: d.expenseAccount || null,
      })),
  };
}

export async function createItem(input: ItemCreateInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc: toDoc(input) },
  });
  return { name: created.name };
}

export async function updateItem(name: string, input: ItemCreateInput): Promise<void> {
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Item", name },
  });
  const doc = {
    ...existing,
    ...toDoc(input),
    // Preserve the server-generated name so save() updates in place.
    name: existing.name,
  };
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: { doc },
  });
}

/** Not submittable in ERPNext — "delete" means `frappe.client.delete`
 *  when safe (no stock, no transactions). Prefer disabled=1 otherwise. */
export async function setItemDisabled(name: string, disabled: boolean): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Item", name, fieldname: "disabled", value: disabled ? 1 : 0 },
  });
}

// Keep submitDoc import live for parity with other voucher libs even
// though Item isn't submittable — avoids pointless import churn if
// a future workflow needs it.
export const _ignore = submitDoc;

// ── Lookups for the form ─────────────────────────────────────────

export async function listItemGroups(): Promise<Array<{ name: string }>> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Item Group",
      fields: ["name"],
      order_by: "name asc",
      limit_page_length: 500,
    },
  });
  return rows.map((r) => ({ name: String(r.name ?? "") }));
}

export async function listUOMs(): Promise<Array<{ name: string }>> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "UOM",
      fields: ["name"],
      order_by: "name asc",
      limit_page_length: 200,
    },
  });
  return rows.map((r) => ({ name: String(r.name ?? "") }));
}

export async function createItemGroup(name: string, parent?: string): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Item Group",
        item_group_name: name,
        parent_item_group: parent || "All Item Groups",
        is_group: 0,
      },
    },
  });
  return { name: created.name };
}

/** Rename a leaf Item Group. Frappe autoname uses the group name as
 *  the id, so renaming the field also renames the record via
 *  `frappe.client.rename_doc`. Returns the new id. */
export async function renameItemGroup(oldName: string, newName: string): Promise<{ name: string }> {
  const target = newName.trim();
  if (!target) throw new Error("New name is required.");
  if (target === oldName) return { name: oldName };
  const res = await frappeCall<{ name?: string } | string>({
    method: "frappe.client.rename_doc",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Item Group",
      old_name: oldName,
      new_name: target,
      merge: 0,
    },
  });
  return { name: typeof res === "string" ? res : (res?.name ?? target) };
}

/** Delete an Item Group. Frappe refuses the delete if the group has
 *  children or if any Item references it; the error bubbles up to the
 *  server action for the UI to surface. */
export async function deleteItemGroup(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Item Group", name },
  });
}
