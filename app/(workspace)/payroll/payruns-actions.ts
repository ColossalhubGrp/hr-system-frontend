"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { frappeCall } from "@/lib/frappe/client";
import { getMyAccess } from "@/lib/frappe/roles";

/**
 * Belina-flow Payroll Run server actions. Each one is a thin wrapper
 * around the Python whitelisted methods in
 * tenant_manager.payroll_engine.api.belina_run.
 */

async function ensurePayrollAdmin(): Promise<void> {
  const access = await getMyAccess();
  if (!access.isPayrollAdmin && !access.isHrAdmin) {
    throw new Error("You need Payroll Admin or HR Admin to run payroll.");
  }
}

function unwrap<T>(res: T | { message?: T }): T {
  if (res && typeof res === "object" && "message" in (res as object)) {
    return ((res as { message?: T }).message ?? (res as T));
  }
  return res as T;
}

// ── create_period ────────────────────────────────────────────────

export async function createPeriod(formData: FormData): Promise<void> {
  await ensurePayrollAdmin();
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);
  if (!month || !year) throw new Error("Pick a month and year.");

  const raw = await frappeCall<
    { payroll_run: string; exists: boolean } | { message?: { payroll_run: string; exists: boolean } }
  >({
    method: "tenant_manager.payroll_engine.api.belina_run.create_period",
    args: { month, year },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath("/payroll");
  redirect(
    `/payroll/${encodeURIComponent(result.payroll_run)}` +
      (result.exists ? "?exists=1" : ""),
  );
}

// ── process_period ───────────────────────────────────────────────

export async function processPeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.process_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── update_period (close) ────────────────────────────────────────

export async function updatePeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.update_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── reopen_period ────────────────────────────────────────────────

export async function reopenPeriod(payrollRun: string): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "tenant_manager.payroll_engine.api.belina_run.reopen_period",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
}

// ── wizard: per-employee entry upsert ────────────────────────────

/**
 * Patch shape mirrors Payroll Wizard Entry's field set. Any subset
 * of these keys may be sent — the backend writes only what you pass.
 */
export type WizardEntryPatch = Partial<{
  payroll_class: "SALARIED" | "HOURLY" | "CONTRACTOR";
  salary_adjustment_usd: number;
  hourly_rate_usd: number;
  hours_worked: number;
  overtime_hours: number;
  overtime_multiplier: number;
  contractor_flat_usd: number;
}>;

export async function upsertWizardEntry(
  payrollRun: string,
  employee: string,
  patch: WizardEntryPatch,
): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "recruitment_app.api.approvals.admin_upsert_wizard_entry",
    args: {
      payroll_run: payrollRun,
      employee,
      // Backend accepts either JSON string or object; JSON is safer
      // to avoid Frappe silently dropping unknown top-level args.
      patch: JSON.stringify(patch),
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/run`);
}

// ── timesheets ───────────────────────────────────────────────────

/**
 * Server-side refetch of the timesheet list for a run — used by
 * the /timesheets client page to sync its local state after an
 * import / upload / approve mutation, since router.refresh()
 * re-runs the server component but doesn't reset the client's
 * useState-held rows.
 */
export async function listTimesheetsAction(payrollRun: string) {
  await ensurePayrollAdmin();
  // Lazy import — listTimesheetsForRun is server-only.
  const { listTimesheetsForRun } = await import("@/lib/frappe/payroll-timesheets");
  return listTimesheetsForRun(payrollRun);
}

export async function importTimesheetsFromAttendance(
  payrollRun: string,
): Promise<{ imported: number; period_from: string; period_to: string }> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    | { imported: number; period_from: string; period_to: string }
    | { message?: { imported: number; period_from: string; period_to: string } }
  >({
    method: "recruitment_app.api.approvals.admin_import_timesheets_from_attendance",
    args: { payroll_run: payrollRun },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/timesheets`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/run`);
  return result;
}

export async function uploadTimesheetCsv(
  payrollRun: string,
  csvText: string,
): Promise<{ accepted: number; rejected: string[] }> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    { accepted: number; rejected: string[] } | { message?: { accepted: number; rejected: string[] } }
  >({
    method: "recruitment_app.api.approvals.admin_upload_timesheet_csv",
    args: { payroll_run: payrollRun, csv_text: csvText },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/timesheets`);
  return result;
}

export type TimesheetPatch = Partial<{
  regular_hours: number;
  overtime_hours: number;
  weekend_hours: number;
  holiday_hours: number;
  approved: 0 | 1;
  notes: string | null;
}>;

export async function upsertTimesheet(
  payrollRun: string,
  employee: string,
  patch: TimesheetPatch,
): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "recruitment_app.api.approvals.admin_upsert_timesheet",
    args: {
      payroll_run: payrollRun,
      employee,
      patch: JSON.stringify(patch),
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/timesheets`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/run`);
}

export async function approveAllTimesheets(
  payrollRun: string,
  employees?: string[],
): Promise<{ approved: number }> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    { approved: number } | { message?: { approved: number } }
  >({
    method: "recruitment_app.api.approvals.admin_approve_timesheets",
    args: {
      payroll_run: payrollRun,
      ...(employees ? { employees: JSON.stringify(employees) } : {}),
    },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/timesheets`);
  return result;
}

// ── off-cycle ────────────────────────────────────────────────────

export async function createOffCycleRun(formData: FormData): Promise<void> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    { payroll_run: string } | { message?: { payroll_run: string } }
  >({
    method: "tenant_manager.payroll_engine.api.belina_run.create_off_cycle_run",
    args: {
      title: String(formData.get("title") || "Special Run"),
      run_type: String(formData.get("runType") || "BONUS"),
      basis: String(formData.get("basis") || "ONE_MONTH"),
      flat_usd: Number(formData.get("flatUsd") || 0),
      pay_date: String(formData.get("payDate") || ""),
    },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath("/payroll");
  redirect(`/payroll/${encodeURIComponent(result.payroll_run)}?offcycle=1`);
}
