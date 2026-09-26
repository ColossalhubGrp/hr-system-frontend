import "server-only";
import { FrappeRequestError, frappeCall } from "../client";

/**
 * ERPNext "Cost Center Allocation" — splits a "main" cost center into
 * multiple sub-cost-centers by percentage, valid from a date onwards.
 */

export type CostCenterAllocation = {
  name: string;
  company: string;
  mainCostCenter: string;
  validFrom: string;
  docstatus: 0 | 1 | 2;
};

export type AllocationPct = { idx: number; costCenter: string; percentage: number };

export type CostCenterAllocationDetail = CostCenterAllocation & {
  percentages: AllocationPct[];
};

export async function listCostCenterAllocations(): Promise<CostCenterAllocation[]> {
  const rows = await frappeCall<Array<Record<string, unknown>>>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Cost Center Allocation",
      fields: ["name", "company", "main_cost_center", "valid_from", "docstatus"],
      order_by: "valid_from desc",
      limit_page_length: 0,
    },
  });
  return rows.map((r) => ({
    name: String(r.name ?? ""),
    company: String(r.company ?? ""),
    mainCostCenter: String(r.main_cost_center ?? ""),
    validFrom: String(r.valid_from ?? ""),
    docstatus: (r.docstatus as 0 | 1 | 2) ?? 0,
  }));
}

export async function getCostCenterAllocation(name: string): Promise<CostCenterAllocationDetail | null> {
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      as: "user",
      args: { doctype: "Cost Center Allocation", name },
    });
    const pcts = (doc.allocation_percentages as Array<Record<string, unknown>>) ?? [];
    return {
      name: String(doc.name ?? name),
      company: String(doc.company ?? ""),
      mainCostCenter: String(doc.main_cost_center ?? ""),
      validFrom: String(doc.valid_from ?? ""),
      docstatus: (doc.docstatus as 0 | 1 | 2) ?? 0,
      percentages: pcts.map((r, i) => ({
        idx: Number(r.idx ?? i + 1),
        costCenter: String(r.cost_center ?? ""),
        percentage: Number(r.percentage ?? 0),
      })),
    };
  } catch (e) {
    if (e instanceof FrappeRequestError && e.status === 404) return null;
    throw e;
  }
}

export type CostCenterAllocationInput = {
  company: string;
  mainCostCenter: string;
  validFrom: string;
  percentages: Array<{ costCenter: string; percentage: number }>;
};

export async function createCostCenterAllocation(input: CostCenterAllocationInput): Promise<{ name: string }> {
  const doc = {
    doctype: "Cost Center Allocation",
    company: input.company,
    main_cost_center: input.mainCostCenter,
    valid_from: input.validFrom,
    allocation_percentages: input.percentages.map((p) => ({ cost_center: p.costCenter, percentage: p.percentage })),
  };
  const created = await frappeCall<{ name: string }>({
    method: "frappe.client.insert",
    as: "user",
    verb: "POST",
    args: { doc },
  });
  return { name: created.name };
}

export async function updateCostCenterAllocation(name: string, input: CostCenterAllocationInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Cost Center Allocation",
      name,
      fieldname: {
        company: input.company,
        main_cost_center: input.mainCostCenter,
        valid_from: input.validFrom,
      },
    },
  });
  await frappeCall({
    method: "frappe.client.save",
    as: "user",
    verb: "POST",
    args: {
      doc: {
        doctype: "Cost Center Allocation",
        name,
        allocation_percentages: input.percentages.map((p) => ({ cost_center: p.costCenter, percentage: p.percentage })),
      },
    },
  });
}

export async function submitCostCenterAllocation(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.submit",
    as: "user",
    verb: "POST",
    args: { doc: { doctype: "Cost Center Allocation", name } },
  });
}

export async function deleteCostCenterAllocation(name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    as: "user",
    verb: "POST",
    args: { doctype: "Cost Center Allocation", name },
  });
}
