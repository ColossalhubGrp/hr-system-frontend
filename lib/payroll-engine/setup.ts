import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Setup master-data layer — backed by Frappe, with the EXACT shape
 * Belina's UI expects (name + branch + sort_code for Bank, code +
 * name + min/max USD/ZiG for Pay Grade, etc).
 *
 * Doctypes:
 *   Bank                       Frappe core + Custom Fields (branch, sort_code)
 *   Department                 Frappe core + Custom Field (cost_centre)
 *   Payroll Pay Grade          ours
 *   Payroll Pay Point          ours
 *   Payroll NEC Industry       ours (name-only)
 *   Payroll Transaction Code   ours
 */

async function listDocs<T extends Record<string, unknown>>(
  doctype: string,
  opts: {
    fields: string[];
    filters?: Record<string, unknown>;
    orderBy?: string;
    limit?: number;
  },
): Promise<T[]> {
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype,
        filters: opts.filters ?? {},
        fields: opts.fields,
        order_by: opts.orderBy ?? "modified desc",
        limit_page_length: opts.limit ?? 500,
      },
      as: "user",
    });
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    return rows as T[];
  } catch (err) {
    console.error(`[setup] listDocs ${doctype} failed:`, err);
    return [];
  }
}

async function insertDoc(doctype: string, doc: Record<string, unknown>): Promise<string> {
  const res = await frappeCall<{ name: string } | { message?: { name: string } }>({
    method: "frappe.client.insert",
    args: { doc: { doctype, ...doc } },
    as: "user",
    verb: "POST",
  });
  const inner = (res as { message?: { name: string } }).message ?? res;
  return (inner as { name: string }).name;
}

async function updateDoc(
  doctype: string,
  name: string,
  changes: Record<string, unknown>,
): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    args: { doctype, name, fieldname: changes },
    as: "user",
    verb: "POST",
  });
}

async function deleteDoc(doctype: string, name: string): Promise<void> {
  await frappeCall({
    method: "frappe.client.delete",
    args: { doctype, name },
    as: "user",
    verb: "POST",
  });
}

// ── Banks (Frappe Bank + Custom Fields branch + sort_code) ──────

export type BankRow = {
  name: string;       // doc id (= bank_name due to autoname:field:bank_name)
  bank_name: string;
  branch?: string;
  sort_code?: string;
};

export async function listBanks(): Promise<BankRow[]> {
  return listDocs<BankRow>("Bank", {
    fields: ["name", "bank_name", "branch", "sort_code"],
    orderBy: "bank_name asc",
  });
}
export const createBank = (d: { bank_name: string; branch?: string; sort_code?: string }) =>
  insertDoc("Bank", d);
export const updateBank = (name: string, d: Partial<BankRow>) =>
  updateDoc("Bank", name, d);
export const deleteBank = (name: string) => deleteDoc("Bank", name);

// ── Pay Grades (Payroll Pay Grade) ───────────────────────────────
// Fixed salary per grade, not a range. Which grading system the row
// belongs to (Paterson, GS, ...) is set at seed time and shown so
// admins can group visually.

export type PayGradeRow = {
  name: string;
  code: string;
  grade_name?: string;
  salary_usd?: number;
  salary_zig?: number;
  grading_system?: string | null;
  description?: string | null;
  is_nec_grade?: 0 | 1 | boolean;
};

export async function listPayGrades(): Promise<PayGradeRow[]> {
  // `code asc` string-sorts (10 before 2), which reads ugly for
  // numeric ladders like Castellion 1..25 or Peromnes 1..19. Grades
  // are wiped + re-seeded in ladder order on every system load, so
  // insertion timestamp reflects the intended order — Paterson goes
  // A1, A2, …, F6; Castellion goes 1, 2, …, 25. Manually-added
  // grades get appended, which is what the user expects.
  return listDocs<PayGradeRow>("Payroll Pay Grade", {
    fields: [
      "name", "code", "grade_name",
      "salary_usd", "salary_zig",
      "grading_system", "description",
      "is_nec_grade",
    ],
    orderBy: "creation asc",
  });
}
export const createPayGrade = (d: {
  code: string; grade_name?: string;
  salary_usd?: number; salary_zig?: number;
  grading_system?: string | null; description?: string | null;
  is_nec_grade?: 0 | 1;
}) => insertDoc("Payroll Pay Grade", d);
export const updatePayGrade = (name: string, d: Partial<PayGradeRow>) =>
  updateDoc("Payroll Pay Grade", name, d);
export const deletePayGrade = (name: string) =>
  deleteDoc("Payroll Pay Grade", name);

// ── Grading Systems (Payroll Grading System) ─────────────────────

export type GradingSystemRow = {
  name: string;         // === system_name (autoname:field:system_name)
  system_name: string;
  region?: string | null;
  common_users?: string | null;
};

export async function listGradingSystems(): Promise<GradingSystemRow[]> {
  return listDocs<GradingSystemRow>("Payroll Grading System", {
    fields: ["name", "system_name", "region", "common_users"],
    orderBy: "system_name asc",
    limit: 100,
  });
}

// ── Departments (Frappe Department + Custom Field cost_centre) ──

export type DepartmentRow = {
  name: string;
  department: string;
  cost_centre?: string;
};

export async function listDepartments(): Promise<DepartmentRow[]> {
  const company = await myCompany();
  return listDocs<DepartmentRow>("Department", {
    fields: ["name", "department", "cost_centre"],
    filters: company ? { company } : {},
    orderBy: "department asc",
  });
}
export const createDepartment = async (d: { department: string; cost_centre?: string }) => {
  const company = await myCompany();
  return insertDoc("Department", {
    department: d.department,
    department_name: d.department,
    cost_centre: d.cost_centre,
    company,
    is_group: 0,
  });
};
export const updateDepartment = (
  name: string,
  d: { department?: string; cost_centre?: string },
) => updateDoc("Department", name, d);
export const deleteDepartment = (name: string) => deleteDoc("Department", name);

// ── Pay Points ───────────────────────────────────────────────────

export type PayPointRow = {
  name: string;
  pay_point_name: string;
  location?: string;
};

export async function listPayPoints(): Promise<PayPointRow[]> {
  return listDocs<PayPointRow>("Payroll Pay Point", {
    fields: ["name", "pay_point_name", "location"],
    orderBy: "pay_point_name asc",
  });
}
export const createPayPoint = (d: { pay_point_name: string; location?: string }) =>
  insertDoc("Payroll Pay Point", d);
export const updatePayPoint = (name: string, d: Partial<PayPointRow>) =>
  updateDoc("Payroll Pay Point", name, d);
export const deletePayPoint = (name: string) => deleteDoc("Payroll Pay Point", name);

// ── NEC Industries ───────────────────────────────────────────────

export type NecIndustryRow = {
  name: string;
  industry_name: string;
  council_name?: string | null;
  bp_number?: string | null;
  remittance_bank?: string | null;
  dues_amount_usd?: number;
  dues_pct?: number;
  employer_share_pct?: number;
};

export async function listNecIndustries(): Promise<NecIndustryRow[]> {
  return listDocs<NecIndustryRow>("Payroll NEC Industry", {
    fields: [
      "name", "industry_name", "council_name",
      "bp_number", "remittance_bank",
      "dues_amount_usd", "dues_pct", "employer_share_pct",
    ],
    orderBy: "industry_name asc",
  });
}
export const createNecIndustry = (d: Partial<NecIndustryRow> & { industry_name: string }) =>
  insertDoc("Payroll NEC Industry", d);

export interface NecScheduleRow {
  code: string;
  grade_name: string | null;
  is_nec_grade: boolean;
  flat_usd: number;
  flat_zig: number;
  salary_usd: number;   // industry-specific; 0 when unset
  salary_zig: number;
}

/** Full editing payload for a single industry: grading system name +
 *  every Payroll Pay Grade with its industry-specific salary (0 when
 *  the NEC hasn't published a figure yet). */
export async function getNecSchedule(industry: string): Promise<{
  industry: string;
  grading_system: string | null;
  rows: NecScheduleRow[];
}> {
  const { frappeCall } = await import("@/lib/frappe/client");
  const res = await frappeCall<{
    industry: string;
    grading_system: string | null;
    rows: NecScheduleRow[];
  }>({
    method: "tenant_manager.payroll_engine.api.nec_schedule.get_schedule",
    args: { industry },
    as: "user",
  });
  return res ?? { industry, grading_system: null, rows: [] };
}
export const updateNecIndustry = (name: string, d: Partial<NecIndustryRow>) =>
  updateDoc("Payroll NEC Industry", name, d);
export const deleteNecIndustry = (name: string) =>
  deleteDoc("Payroll NEC Industry", name);

// ── Transaction Codes ────────────────────────────────────────────

export type TxnCodeRow = {
  name: string;
  code: string;
  kind: "EARNING" | "DEDUCTION";
  default_currency?: string;
  taxable: 0 | 1 | boolean;
};

export async function listTxnCodes(): Promise<TxnCodeRow[]> {
  return listDocs<TxnCodeRow>("Payroll Transaction Code", {
    fields: ["name", "code", "kind", "default_currency", "taxable"],
    orderBy: "kind asc, code asc",
  });
}
export const createTxnCode = (d: {
  code: string;
  kind: "EARNING" | "DEDUCTION";
  default_currency: string;
  taxable: 0 | 1;
}) => insertDoc("Payroll Transaction Code", d);
export const updateTxnCode = (name: string, d: Partial<TxnCodeRow>) =>
  updateDoc("Payroll Transaction Code", name, d);
export const deleteTxnCode = (name: string) =>
  deleteDoc("Payroll Transaction Code", name);
