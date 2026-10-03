import "server-only";
import { FrappeRequestError, frappeCall } from "./client";

/**
 * Cost Center tree — mirrors the Chart of Accounts helpers, but for
 * ERPNext's Cost Center DocType. Cost centers are how a company slices
 * P&L by branch, department or project.
 */

export type CostCenter = {
  name: string;
  costCenterName: string;
  parent: string | null;
  isGroup: boolean;
  company: string;
  disabled: boolean;
  lft: number;
  rgt: number;
};

export type CostCenterNode = CostCenter & {
  children: CostCenterNode[];
  depth: number;
};

export async function listCostCenterTree(company: string): Promise<CostCenterNode[]> {
  // `disabled` isn't in the Cost Center list-view field allowlist; asking
  // for it 417s under Frappe v15. Fetched-per-detail otherwise.
  const RICH_FIELDS = [
    "name",
    "cost_center_name",
    "parent_cost_center",
    "is_group",
    "company",
    "lft",
    "rgt",
  ];
  const SAFE_FIELDS = ["name", "cost_center_name", "parent_cost_center", "is_group", "company"];

  // Only a field-level 417 falls back to SAFE_FIELDS. A doctype-level
  // 403 means the signed-in user has no read permission on Cost Center
  // and the correct fix is to widen the role's DocPerm (not to retry
  // under a different identity). The error bubbles up to the page and
  // renders as a readable panel so Admin can see what to grant.
  async function fetch(fields: string[], orderBy: string) {
    return frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "Cost Center",
        fields,
        filters: [["company", "=", company]],
        order_by: orderBy,
        limit_page_length: 0,
      },
    });
  }

  let rows: Array<Record<string, unknown>>;
  try {
    rows = await fetch(RICH_FIELDS, "lft asc");
  } catch (err) {
    if (err instanceof FrappeRequestError && err.status === 417) {
      rows = await fetch(SAFE_FIELDS, "cost_center_name asc");
    } else {
      throw err;
    }
  }

  const centers: CostCenter[] = rows.map((r) => ({
    name: String(r.name ?? ""),
    costCenterName: String(r.cost_center_name ?? ""),
    parent: (r.parent_cost_center as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
    company: String(r.company ?? ""),
    disabled: false, // see fields comment above
    lft: Number(r.lft ?? 0),
    rgt: Number(r.rgt ?? 0),
  }));

  const byName = new Map<string, CostCenterNode>();
  for (const c of centers) byName.set(c.name, { ...c, children: [], depth: 0 });

  const roots: CostCenterNode[] = [];
  for (const c of centers) {
    const node = byName.get(c.name)!;
    if (c.parent && byName.has(c.parent)) {
      const parent = byName.get(c.parent)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getCostCenter(name: string): Promise<CostCenter | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Cost Center", name },
    });
    return {
      name: String(doc.name ?? name),
      costCenterName: String(doc.cost_center_name ?? ""),
      parent: (doc.parent_cost_center as string | null) ?? null,
      isGroup: Number(doc.is_group ?? 0) === 1,
      company: String(doc.company ?? ""),
      disabled: Number(doc.disabled ?? 0) === 1,
      lft: Number(doc.lft ?? 0),
      rgt: Number(doc.rgt ?? 0),
    };
  } catch {
    return null;
  }
}

// ── Mutations ────────────────────────────────────────────────────

export type CostCenterCreateInput = {
  costCenterName: string;
  company: string;
  parentCostCenter: string;
  isGroup: boolean;
};

export async function createCostCenter(input: CostCenterCreateInput): Promise<{ name: string }> {
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Cost Center",
        cost_center_name: input.costCenterName,
        company: input.company,
        parent_cost_center: input.parentCostCenter,
        is_group: input.isGroup ? 1 : 0,
      },
    },
  });
  return { name: created.name };
}

/** Update the name / is_group / disabled fields on an existing node.
 *  Renames go through `frappe.client.rename_doc` because the autoname
 *  is `cost_center_name - abbr` and renaming is the only way to change
 *  the surface identifier. */
export async function updateCostCenter(
  name: string,
  patch: { costCenterName?: string; isGroup?: boolean; disabled?: boolean },
): Promise<{ name: string }> {
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Cost Center", name },
  });

  // Field-level updates (is_group, disabled). cost_center_name needs
  // a rename to flow through to `name`.
  const fieldPatch: Record<string, unknown> = {};
  if (patch.isGroup !== undefined) fieldPatch.is_group = patch.isGroup ? 1 : 0;
  if (patch.disabled !== undefined) fieldPatch.disabled = patch.disabled ? 1 : 0;
  if (patch.costCenterName && patch.costCenterName !== existing.cost_center_name) {
    fieldPatch.cost_center_name = patch.costCenterName;
  }
  if (Object.keys(fieldPatch).length > 0) {
    await frappeCall({
      method: "frappe.client.set_value",
      as: "user",
      verb: "POST",
      args: { doctype: "Cost Center", name, fieldname: fieldPatch },
    });
  }

  // Rename when the cost center name changed — Frappe recomputes the
  // doc id from `cost_center_name - abbr` and updates GL references.
  if (patch.costCenterName && patch.costCenterName !== existing.cost_center_name) {
    const abbr = String((existing.company as string) ?? "").toUpperCase();
    const newId = await resolveNewId(name, patch.costCenterName);
    try {
      const renamed = await frappeCall<{ name?: string } | string>({
        method: "frappe.client.rename_doc",
        as: "user",
        verb: "POST",
        args: {
          doctype: "Cost Center",
          old_name: name,
          new_name: newId,
          merge: 0,
        },
      });
      const newName = typeof renamed === "string" ? renamed : renamed?.name;
      if (newName) return { name: newName };
    } catch {
      // If rename fails (duplicate, perm), keep the old id with the
      // updated cost_center_name field. The display name follows the
      // field; the record id stays stable. abbr unused in that branch.
      void abbr;
    }
  }

  return { name };
}

/** Build the expected id Frappe autoname would produce for the renamed
 *  node: "<cost_center_name> - <company abbr>". We fetch the company's
 *  abbr first so the rename target matches ERPNext's naming series. */
async function resolveNewId(oldName: string, newLabel: string): Promise<string> {
  const existing = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Cost Center", name: oldName },
  });
  const company = String(existing.company ?? "");
  if (!company) return newLabel;
  try {
    const comp = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get_value",
      as: "user",
      args: { doctype: "Company", filters: { name: company }, fieldname: "abbr" },
    });
    const abbr = String((comp as { abbr?: string }).abbr ?? "").toUpperCase();
    return abbr ? `${newLabel.trim()} - ${abbr}` : newLabel.trim();
  } catch {
    return newLabel.trim();
  }
}

export async function setCostCenterDisabled(name: string, disabled: boolean): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Cost Center", name, fieldname: "disabled", value: disabled ? 1 : 0 },
  });
}

/** Does this cost center have ANY GL postings? True → the row can't
 *  be hard-deleted; we fall back to disable=1 so history is preserved. */
async function hasGlEntries(name: string): Promise<boolean> {
  try {
    const rows = await frappeCall<Array<{ name: string }>>({
      method: "frappe.client.get_list",
      as: "user",
      args: {
        doctype: "GL Entry",
        fields: ["name"],
        filters: [["cost_center", "=", name]],
        limit_page_length: 1,
      },
    });
    return rows.length > 0;
  } catch {
    // On a 403 we can't tell; assume referenced to be safe.
    return true;
  }
}

/** Smart delete: hard-delete only when the row has no children AND no
 *  GL postings. Otherwise mark it disabled and return the action taken
 *  so the UI can tell the user what happened. */
export async function smartDeleteCostCenter(
  name: string,
): Promise<{ action: "deleted" | "disabled"; reason?: string }> {
  // Children: query by parent_cost_center. If any, don't delete.
  const children = await frappeCall<Array<{ name: string }>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Cost Center",
      fields: ["name"],
      filters: [["parent_cost_center", "=", name]],
      limit_page_length: 1,
    },
  }).catch(() => [] as Array<{ name: string }>);
  if (children.length > 0) {
    await setCostCenterDisabled(name, true);
    return { action: "disabled", reason: "has child cost centers" };
  }

  if (await hasGlEntries(name)) {
    await setCostCenterDisabled(name, true);
    return { action: "disabled", reason: "has ledger postings" };
  }

  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Cost Center", name },
  });
  return { action: "deleted" };
}
