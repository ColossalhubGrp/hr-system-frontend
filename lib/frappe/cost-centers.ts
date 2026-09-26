import "server-only";
import { frappeCall } from "./client";

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
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Cost Center",
      fields: [
        "name",
        "cost_center_name",
        "parent_cost_center",
        "is_group",
        "company",
        "disabled",
        "lft",
        "rgt",
      ],
      filters: [["company", "=", company]],
      order_by: "lft asc",
      limit_page_length: 0,
    },
  });

  const centers: CostCenter[] = rows.map((r) => ({
    name: String(r.name ?? ""),
    costCenterName: String(r.cost_center_name ?? ""),
    parent: (r.parent_cost_center as string | null) ?? null,
    isGroup: Number(r.is_group ?? 0) === 1,
    company: String(r.company ?? ""),
    disabled: Number(r.disabled ?? 0) === 1,
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
