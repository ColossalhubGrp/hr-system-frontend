import "server-only";
import { frappeCall } from "./client";

export type BranchRow = {
  id: string;
  name: string;
  weeklyLaborBudget: number;
};

export type BranchInput = {
  branch: string;
  weekly_labor_budget?: number;
};

export async function listBranches(): Promise<BranchRow[]> {
  type Row = {
    name: string;
    branch: string | null;
    weekly_labor_budget: number | null;
  };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Branch",
      fields: ["name", "branch", "weekly_labor_budget"],
      order_by: "branch asc",
      limit_page_length: 200,
    },
    as: "user",
  }).catch(() => [] as Row[]);
  return rows.map((r) => ({
    id: r.name,
    name: r.branch ?? r.name,
    weeklyLaborBudget: Number(r.weekly_labor_budget ?? 0),
  }));
}

export async function createBranch(input: BranchInput): Promise<string> {
  const doc = {
    doctype: "Branch",
    branch: input.branch,
    ...(input.weekly_labor_budget !== undefined
      ? { weekly_labor_budget: input.weekly_labor_budget }
      : {}),
  };
  const saved = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    verb: "POST",
    args: { doc },
    as: "user",
  });
  return saved.name;
}
