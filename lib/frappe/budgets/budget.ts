import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Budget" — cap spending against an account, per Cost
 * Center / Project / Accounting Dimension. Sales orders, POs and
 * actual GL postings can be stopped/warned when the cap is hit.
 */

export const BUDGET_AGAINST = ["Cost Center", "Project", "Accounting Dimension"] as const;
export const ACTIONS = ["", "Stop", "Warn", "Ignore"] as const;

export type BudgetRow = {
  name: string;
  budgetAgainst: string;
  company: string;
  fiscalYear: string;
  costCenter: string | null;
  project: string | null;
  monthlyDistribution: string | null;
  docstatus: 0 | 1 | 2;
};

export type BudgetAccount = {
  idx: number;
  account: string;
  budgetAmount: number;
};

export type BudgetDetail = BudgetRow & {
  accountingDimension: string | null;
  applicableOnMaterialRequest: boolean;
  applicableOnPurchaseOrder: boolean;
  applicableOnBookingActualExpenses: boolean;
  actionIfAnnualBudgetExceeded: string;
  actionIfAnnualBudgetExceededOnMr: string;
  actionIfAnnualBudgetExceededOnPo: string;
  actionIfAccumulatedMonthlyBudgetExceeded: string;
  actionIfAccumulatedMonthlyBudgetExceededOnMr: string;
  actionIfAccumulatedMonthlyBudgetExceededOnPo: string;
  accounts: BudgetAccount[];
};

export async function listBudgets(): Promise<BudgetRow[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Budget",
      fields: [
        "name", "budget_against", "company", "fiscal_year",
        "cost_center", "project", "monthly_distribution", "docstatus",
      ],
      order_by: "fiscal_year desc, name asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    budgetAgainst: String(r.budget_against ?? "Cost Center"),
    company: String(r.company ?? ""),
    fiscalYear: String(r.fiscal_year ?? ""),
    costCenter: (r.cost_center as string | null) ?? null,
    project: (r.project as string | null) ?? null,
    monthlyDistribution: (r.monthly_distribution as string | null) ?? null,
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));
}

export async function getBudget(name: string): Promise<BudgetDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Budget", name },
    });
    const accounts = (doc.accounts as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      budgetAgainst: String(doc.budget_against ?? "Cost Center"),
      company: String(doc.company ?? ""),
      fiscalYear: String(doc.fiscal_year ?? ""),
      costCenter: (doc.cost_center as string | null) ?? null,
      project: (doc.project as string | null) ?? null,
      accountingDimension: (doc.accounting_dimension as string | null) ?? null,
      monthlyDistribution: (doc.monthly_distribution as string | null) ?? null,
      applicableOnMaterialRequest: Number(doc.applicable_on_material_request ?? 0) === 1,
      applicableOnPurchaseOrder: Number(doc.applicable_on_purchase_order ?? 0) === 1,
      applicableOnBookingActualExpenses: Number(doc.applicable_on_booking_actual_expenses ?? 0) === 1,
      actionIfAnnualBudgetExceeded: String(doc.action_if_annual_budget_exceeded ?? ""),
      actionIfAnnualBudgetExceededOnMr: String(doc.action_if_annual_budget_exceeded_on_mr ?? ""),
      actionIfAnnualBudgetExceededOnPo: String(doc.action_if_annual_budget_exceeded_on_po ?? ""),
      actionIfAccumulatedMonthlyBudgetExceeded: String(doc.action_if_accumulated_monthly_budget_exceeded ?? ""),
      actionIfAccumulatedMonthlyBudgetExceededOnMr: String(doc.action_if_accumulated_monthly_budget_exceeded_on_mr ?? ""),
      actionIfAccumulatedMonthlyBudgetExceededOnPo: String(doc.action_if_accumulated_monthly_budget_exceeded_on_po ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      accounts: accounts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        account: String(r.account ?? ""),
        budgetAmount: Number(r.budget_amount ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type BudgetInput = {
  budgetAgainst: string;
  company: string;
  fiscalYear: string;
  costCenter?: string;
  project?: string;
  accountingDimension?: string;
  monthlyDistribution?: string;
  applicableOnMaterialRequest: boolean;
  applicableOnPurchaseOrder: boolean;
  applicableOnBookingActualExpenses: boolean;
  actionIfAnnualBudgetExceeded: string;
  actionIfAnnualBudgetExceededOnMr: string;
  actionIfAnnualBudgetExceededOnPo: string;
  actionIfAccumulatedMonthlyBudgetExceeded: string;
  actionIfAccumulatedMonthlyBudgetExceededOnMr: string;
  actionIfAccumulatedMonthlyBudgetExceededOnPo: string;
  accounts: Array<{ account: string; budgetAmount: number }>;
};

function payload(input: BudgetInput): Record<string, unknown> {
  return {
    budget_against: input.budgetAgainst,
    company: input.company,
    fiscal_year: input.fiscalYear,
    cost_center: input.budgetAgainst === "Cost Center" ? input.costCenter || null : null,
    project: input.budgetAgainst === "Project" ? input.project || null : null,
    accounting_dimension: input.budgetAgainst === "Accounting Dimension" ? input.accountingDimension || null : null,
    monthly_distribution: input.monthlyDistribution || null,
    applicable_on_material_request: input.applicableOnMaterialRequest ? 1 : 0,
    applicable_on_purchase_order: input.applicableOnPurchaseOrder ? 1 : 0,
    applicable_on_booking_actual_expenses: input.applicableOnBookingActualExpenses ? 1 : 0,
    action_if_annual_budget_exceeded: input.actionIfAnnualBudgetExceeded || null,
    action_if_annual_budget_exceeded_on_mr: input.actionIfAnnualBudgetExceededOnMr || null,
    action_if_annual_budget_exceeded_on_po: input.actionIfAnnualBudgetExceededOnPo || null,
    action_if_accumulated_monthly_budget_exceeded: input.actionIfAccumulatedMonthlyBudgetExceeded || null,
    action_if_accumulated_monthly_budget_exceeded_on_mr: input.actionIfAccumulatedMonthlyBudgetExceededOnMr || null,
    action_if_accumulated_monthly_budget_exceeded_on_po: input.actionIfAccumulatedMonthlyBudgetExceededOnPo || null,
  };
}

export async function createBudget(input: BudgetInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Budget",
    ...payload(input),
    accounts: input.accounts.map((a) => ({ account: a.account, budget_amount: a.budgetAmount })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateBudget(name: string, input: BudgetInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: { doctype: "Budget", name, fieldname: payload(input) },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Budget",
        name,
        accounts: input.accounts.map((a) => ({ account: a.account, budget_amount: a.budgetAmount })),
      },
    },
  });
}

export async function submitBudget(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Budget", name } },
  });
}

export async function cancelBudget(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.cancel",
    as: "user",
    verb: "POST",
    args: { doctype: "Budget", name },
  });
}

export async function deleteBudget(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Budget", name },
  });
}
