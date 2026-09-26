import "server-only";
import { FrappeRequestError, frappeCall } from "../client";
import { MONTHS } from "./monthly-distribution-constants";

/**
 * ERPNext "Monthly Distribution" — 12 percentages that add up to 100.
 * Used to spread a budget or a target across months (e.g. seasonal
 * sales targets: heavy in Q4, light in Q1).
 */

export type MonthlyDistribution = {
  name: string;
  distributionId: string;
  fiscalYear: string | null;
};

export type MonthlyRow = { idx: number; month: string; percentageAllocation: number };

export type MonthlyDistributionDetail = MonthlyDistribution & { percentages: MonthlyRow[] };

export async function listMonthlyDistributions(): Promise<MonthlyDistribution[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Monthly Distribution",
      fields: ["name", "distribution_id", "fiscal_year"],
      order_by: "distribution_id asc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    distributionId: String(r.distribution_id ?? r.name ?? ""),
    fiscalYear: (r.fiscal_year as string | null) ?? null,
  }));
}

export async function getMonthlyDistribution(name: string): Promise<MonthlyDistributionDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Monthly Distribution", name },
    });
    const pcts = (doc.percentages as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      distributionId: String(doc.distribution_id ?? doc.name ?? ""),
      fiscalYear: (doc.fiscal_year as string | null) ?? null,
      percentages: pcts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        month: String(r.month ?? MONTHS[i] ?? ""),
        percentageAllocation: Number(r.percentage_allocation ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type MonthlyDistributionInput = {
  distributionId: string;
  fiscalYear?: string;
  percentages: Array<{ month: string; percentageAllocation: number }>;
};

export async function createMonthlyDistribution(input: MonthlyDistributionInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Monthly Distribution",
    distribution_id: input.distributionId,
    fiscal_year: input.fiscalYear || undefined,
    percentages: input.percentages.map((p) => ({ month: p.month, percentage_allocation: p.percentageAllocation })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateMonthlyDistribution(name: string, input: Omit<MonthlyDistributionInput, "distributionId">): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Monthly Distribution",
      name,
      fieldname: { fiscal_year: input.fiscalYear || null },
    },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Monthly Distribution",
        name,
        percentages: input.percentages.map((p) => ({ month: p.month, percentage_allocation: p.percentageAllocation })),
      },
    },
  });
}

export async function deleteMonthlyDistribution(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Monthly Distribution", name },
  });
}

export { MONTHS };

