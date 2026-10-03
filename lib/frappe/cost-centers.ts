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

  // The Chart of Cost Centers is tenant-wide reference data — any
  // user who can reach the Accounting workspace needs to see it to
  // post entries. We first ask AS THE USER; if their custom DocPerm
  // bundle is tighter than ERPNext's default (403), fall back to the
  // service key — the structure isn't sensitive and the page is
  // already role-gated at the workspace layout.
  // A field-perm 417 drops to SAFE_FIELDS instead; a 403 is a
  // doctype-level denial and the service retry is the only option.
  async function fetch(as: "user" | "service", fields: string[], orderBy: string) {
    return frappeCall<Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      as,
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
    rows = await fetch("user", RICH_FIELDS, "lft asc");
  } catch (err) {
    if (!(err instanceof FrappeRequestError)) throw err;
    if (err.status === 403) {
      // Fall through to service with rich fields first, then safe.
      try {
        rows = await fetch("service", RICH_FIELDS, "lft asc");
      } catch (err2) {
        if (!(err2 instanceof FrappeRequestError)) throw err2;
        rows = await fetch("service", SAFE_FIELDS, "cost_center_name asc");
      }
    } else {
      // 417 / other — retry as the user with the safe field set.
      rows = await fetch("user", SAFE_FIELDS, "cost_center_name asc");
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
