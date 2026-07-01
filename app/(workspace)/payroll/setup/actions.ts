"use server";

import { revalidatePath } from "next/cache";
import {
  createBank, updateBank, deleteBank,
  createPayGrade, updatePayGrade, deletePayGrade,
  createDepartment, updateDepartment, deleteDepartment,
  createPayPoint, updatePayPoint, deletePayPoint,
  createNecIndustry, updateNecIndustry, deleteNecIndustry,
  createTxnCode, updateTxnCode, deleteTxnCode,
} from "@/lib/payroll-engine/setup";
import { getMyAccess } from "@/lib/frappe/roles";

/**
 * Plain `(formData: FormData) => void` actions — matches Belina's
 * modal-driven flow so AddRecordModal/EditRecordModal can pass them
 * directly to the form `action` prop.
 */

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const n = (fd: FormData, k: string) => Number(fd.get(k) || 0);

async function ensurePayrollAdmin(): Promise<void> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    throw new Error("You need Payroll Admin or HR Admin to edit Setup tables.");
  }
}

// ── Banks ─────────────────────────────────────────────────────────

export async function addBank(fd: FormData) {
  await ensurePayrollAdmin();
  await createBank({
    bank_name: s(fd, "name"),
    branch: s(fd, "branch"),
    sort_code: s(fd, "sortCode"),
  });
  revalidatePath("/payroll/setup/banks");
}
export async function updateBankAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updateBank(s(fd, "id"), {
    bank_name: s(fd, "name"),
    branch: s(fd, "branch"),
    sort_code: s(fd, "sortCode"),
  });
  revalidatePath("/payroll/setup/banks");
}
export async function deleteBankAction(id: string) {
  await ensurePayrollAdmin();
  await deleteBank(id);
  revalidatePath("/payroll/setup/banks");
}

// ── Pay Grades ────────────────────────────────────────────────────

export async function addGrade(fd: FormData) {
  await ensurePayrollAdmin();
  await createPayGrade({
    code: s(fd, "code"),
    grade_name: s(fd, "name"),
    salary_usd: n(fd, "salaryUsd"),
    salary_zig: n(fd, "salaryZig"),
    is_nec_grade: s(fd, "isNecGrade") === "Above NEC" ? 0 : 1,
    description: s(fd, "description") || null,
  });
  revalidatePath("/payroll/setup/pay-grades");
  revalidatePath("/employee");
}
export async function updateGradeAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updatePayGrade(s(fd, "id"), {
    code: s(fd, "code"),
    grade_name: s(fd, "name"),
    salary_usd: n(fd, "salaryUsd"),
    salary_zig: n(fd, "salaryZig"),
    is_nec_grade: s(fd, "isNecGrade") === "Above NEC" ? 0 : 1,
    description: s(fd, "description") || null,
  });
  revalidatePath("/payroll/setup/pay-grades");
  revalidatePath("/employee");
}
export async function deleteGradeAction(id: string) {
  await ensurePayrollAdmin();
  await deletePayGrade(id);
  revalidatePath("/payroll/setup/pay-grades");
}

/**
 * Called from the "Which grading system do you use?" chooser on the
 * empty Pay Grades page. Delegates to the Frappe whitelisted method,
 * which reads the shells from `grading_templates.TEMPLATES`, inserts
 * one Payroll Pay Grade per shell (skipping duplicates), and returns
 * a summary.
 *
 * Salaries seed at 0 — admin edits them per grade after seeding.
 */
export interface SeedGradesResult {
  inserted: number;
  replaced: number;
  no_template: boolean;
  nec_count?: number;
  above_nec_count?: number;
  ceiling?: string;
}

/**
 * `necCeiling` is:
 *   * a grade code (e.g. "C3") → grades at/below it are NEC
 *   * "ALL"                    → every seeded grade is NEC
 *   * "NONE"                   → nothing is NEC (all editable per employee)
 */
export async function seedGradesFromSystem(
  systemName: string,
  necCeiling: string,
): Promise<SeedGradesResult> {
  await ensurePayrollAdmin();
  const { frappeCall } = await import("@/lib/frappe/client");
  const res = await frappeCall<SeedGradesResult>({
    method: "tenant_manager.payroll_engine.api.setup_grades.seed_grades_from_system",
    args: { system_name: systemName, nec_ceiling: necCeiling },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll/setup/pay-grades");
  revalidatePath("/employee");
  return res ?? { inserted: 0, replaced: 0, no_template: false };
}

/** Fetch a system's ordered shells so the chooser can render the
 *  NEC-ceiling dropdown without hard-coding ladders in the client. */
export async function fetchGradeShells(
  systemName: string,
): Promise<Array<{ code: string; name: string }>> {
  const { frappeCall } = await import("@/lib/frappe/client");
  const res = await frappeCall<Array<{ code: string; name: string }>>({
    method: "tenant_manager.payroll_engine.api.setup_grades.grade_shells",
    args: { system_name: systemName },
    as: "user",
  });
  return res ?? [];
}

// ── Departments ───────────────────────────────────────────────────

export async function addDepartment(fd: FormData) {
  await ensurePayrollAdmin();
  await createDepartment({
    department: s(fd, "name"),
    cost_centre: s(fd, "costCentre"),
  });
  revalidatePath("/payroll/setup/departments");
}
export async function updateDepartmentAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updateDepartment(s(fd, "id"), {
    department: s(fd, "name"),
    cost_centre: s(fd, "costCentre"),
  });
  revalidatePath("/payroll/setup/departments");
}
export async function deleteDepartmentAction(id: string) {
  await ensurePayrollAdmin();
  await deleteDepartment(id);
  revalidatePath("/payroll/setup/departments");
}

// ── Pay Points ────────────────────────────────────────────────────

export async function addPayPoint(fd: FormData) {
  await ensurePayrollAdmin();
  await createPayPoint({
    pay_point_name: s(fd, "name"),
    location: s(fd, "location"),
  });
  revalidatePath("/payroll/setup/pay-points");
}
export async function updatePayPointAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updatePayPoint(s(fd, "id"), {
    pay_point_name: s(fd, "name"),
    location: s(fd, "location"),
  });
  revalidatePath("/payroll/setup/pay-points");
}
export async function deletePayPointAction(id: string) {
  await ensurePayrollAdmin();
  await deletePayPoint(id);
  revalidatePath("/payroll/setup/pay-points");
}

// ── NEC Industries ────────────────────────────────────────────────

function readNecFields(fd: FormData) {
  return {
    industry_name: s(fd, "name"),
    council_name: s(fd, "councilName") || null,
    bp_number: s(fd, "bpNumber") || null,
    remittance_bank: s(fd, "remittanceBank") || null,
    dues_amount_usd: n(fd, "duesAmountUsd"),
    dues_pct: n(fd, "duesPct"),
    employer_share_pct: n(fd, "employerSharePct"),
  };
}
export async function addNec(fd: FormData) {
  await ensurePayrollAdmin();
  await createNecIndustry(readNecFields(fd));
  revalidatePath("/payroll/setup/nec");
}
export async function updateNecAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updateNecIndustry(s(fd, "id"), readNecFields(fd));
  revalidatePath("/payroll/setup/nec");
  revalidatePath("/employee");
}
export async function deleteNecAction(id: string) {
  await ensurePayrollAdmin();
  await deleteNecIndustry(id);
  revalidatePath("/payroll/setup/nec");
}

/**
 * Bridge to the whitelisted `get_industry_salary` — returns the
 * industry-preferred salary for a grade, or falls back to the grade's
 * flat salary when the NEC hasn't published a figure. Called from the
 * Employee edit form on grade/industry change.
 *
 * Not gated on Payroll Admin — read-only.
 */
export async function fetchIndustrySalary(
  industry: string,
  grade: string,
): Promise<{ salary_usd: number; salary_zig: number; source: "industry" | "grade" | "none" }> {
  const { frappeCall } = await import("@/lib/frappe/client");
  const res = await frappeCall<{
    salary_usd: number;
    salary_zig: number;
    source: "industry" | "grade" | "none";
  }>({
    method: "tenant_manager.payroll_engine.api.nec_schedule.get_industry_salary",
    args: { industry, grade },
    as: "user",
  });
  return res ?? { salary_usd: 0, salary_zig: 0, source: "none" };
}

export async function saveNecSchedule(
  industry: string,
  rows: Array<{ code: string; salary_usd: number; salary_zig: number }>,
): Promise<{ saved: number }> {
  await ensurePayrollAdmin();
  const { frappeCall } = await import("@/lib/frappe/client");
  const res = await frappeCall<{ industry: string; saved: number }>({
    method: "tenant_manager.payroll_engine.api.nec_schedule.save_schedule",
    args: { industry, rows },
    as: "user",
    verb: "POST",
  });
  revalidatePath(`/payroll/setup/nec/${encodeURIComponent(industry)}/schedule`);
  revalidatePath("/payroll/setup/nec");
  revalidatePath("/employee");
  return { saved: res?.saved ?? 0 };
}

// ── Transaction Codes ─────────────────────────────────────────────

export async function addCode(fd: FormData) {
  await ensurePayrollAdmin();
  await createTxnCode({
    code: s(fd, "code"),
    kind: (s(fd, "kind") || "EARNING") as "EARNING" | "DEDUCTION",
    default_currency: s(fd, "defaultCurrency") || "USD",
    taxable: s(fd, "taxable") !== "Non-taxable" ? 1 : 0,
  });
  revalidatePath("/payroll/setup/codes");
}
export async function updateCodeAction(fd: FormData) {
  await ensurePayrollAdmin();
  await updateTxnCode(s(fd, "id"), {
    code: s(fd, "code"),
    kind: (s(fd, "kind") || "EARNING") as "EARNING" | "DEDUCTION",
    default_currency: s(fd, "defaultCurrency") || "USD",
    taxable: s(fd, "taxable") !== "Non-taxable" ? 1 : 0,
  });
  revalidatePath("/payroll/setup/codes");
}
export async function deleteCodeAction(id: string) {
  await ensurePayrollAdmin();
  await deleteTxnCode(id);
  revalidatePath("/payroll/setup/codes");
}
