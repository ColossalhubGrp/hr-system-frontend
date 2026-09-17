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

/**
 * Per-employee preview of what process_period would produce — runs
 * the ZIMRA engine without persisting slips or updating YTD. Wizard
 * calls this on debounce so the Net column shows real post-tax
 * numbers (PAYE / AIDS / NSSA / pension / medical / NEC dues all
 * subtracted authoritatively by the engine).
 */
export type PreviewSlip = {
  employee: string;
  payroll_class: "SALARIED" | "HOURLY" | "CONTRACTOR";
  gross_usd: number;
  gross_zig?: number;
  taxable_usd: number;
  paye_usd: number;
  aids_usd: number;
  nssa_employee: number;
  nssa_employer?: number;
  pension_usd: number;
  medical_aid: number;
  nec_dues: number;
  zimdef: number;
  net_usd: number;
  net_zig?: number;
  skipped: boolean;
  skipped_reason?: string;
};

export async function previewRunPeriod(
  payrollRun: string,
): Promise<PreviewSlip[]> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    { employees: PreviewSlip[] } | { message?: { employees: PreviewSlip[] } }
  >({
    method: "tenant_manager.payroll_engine.api.belina_run.preview_period",
    args: { payroll_run: payrollRun },
    as: "user",
  });
  const result = unwrap(raw);
  return result?.employees ?? [];
}

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
  include_in_run: 0 | 1;
  salary_adjustment_usd: number;
  hourly_rate_usd: number;
  hours_worked: number;
  overtime_hours: number;
  overtime_multiplier: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  contractor_flat_usd: number;
}>;

/**
 * Update an Employee's master monthly basic salary — USD and/or ZiG.
 * Wired to the wizard's inline Salary cells; edits persist to the
 * Employee record so future runs also read the new base.
 */
export async function updateEmployeeSalary(
  employee: string,
  patch: { basic_usd?: number; basic_zig?: number },
): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "recruitment_app.api.approvals.admin_set_employee_salary",
    args: {
      employee,
      ...(patch.basic_usd !== undefined ? { basic_usd: patch.basic_usd } : {}),
      ...(patch.basic_zig !== undefined ? { basic_zig: patch.basic_zig } : {}),
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath(`/employee/${encodeURIComponent(employee)}`);
}

/**
 * Upsert a single Payroll Transaction cell (one row per
 * run × employee × code). amount == 0 deletes the row. Used by the
 * wizard's dynamic-column grid so every earning code shows as a
 * column with editable amounts per employee.
 */
export async function upsertTxnByCode(
  payrollRun: string,
  employee: string,
  code: string,
  amount: number,
  currency: "USD" | "ZIG" = "USD",
): Promise<void> {
  await ensurePayrollAdmin();
  await frappeCall({
    method: "recruitment_app.api.approvals.admin_upsert_txn_by_code",
    args: {
      payroll_run: payrollRun,
      employee,
      code,
      amount,
      currency,
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}`);
  revalidatePath(`/payroll/${encodeURIComponent(payrollRun)}/run`);
}

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

// ── terminal / retrenchment ──────────────────────────────────────

export type TerminalItem = {
  code: string;
  amount: number;
  package_class:
    | "regular"
    | "retrenchment_eligible"
    | "cash_in_lieu"
    | "exempt_passage";
};

export type TerminalPreview = {
  package_eligible: number;
  cash_in_lieu: number;
  exempt_passage: number;
  exempt: number;
  taxable_base: number;
  gross: number;
  floor: number;
  cap: number;
  fraction: number;
};

/** Live preview of ZIMRA §14 breakdown for the given items. Called
 *  from the Termination Package form on every input change. */
export async function previewTerminalPackage(
  items: TerminalItem[],
): Promise<TerminalPreview> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<TerminalPreview | { message?: TerminalPreview }>({
    method: "recruitment_app.api.approvals.admin_preview_terminal_package",
    args: { items: JSON.stringify(items) },
    as: "user",
  });
  return unwrap(raw);
}

/** Create a TERMINAL off-cycle Payroll Run for one employee with
 *  itemized package amounts. On success returns the payroll_run id
 *  so the caller can navigate to it (and hit Process). */
export async function createTerminalRun(
  employee: string,
  items: TerminalItem[],
  payDate: string,
  notes?: string,
): Promise<{ payroll_run: string; period_label: string }> {
  await ensurePayrollAdmin();
  const raw = await frappeCall<
    | { payroll_run: string; period_label: string }
    | { message?: { payroll_run: string; period_label: string } }
  >({
    method: "recruitment_app.api.approvals.admin_create_terminal_run",
    args: {
      employee,
      items: JSON.stringify(items),
      pay_date: payDate,
      ...(notes ? { notes } : {}),
    },
    as: "user",
    verb: "POST",
  });
  const result = unwrap(raw);
  revalidatePath("/payroll");
  return result;
}

// ── compliance ───────────────────────────────────────────────────

/**
 * Stamp a Company Payroll Settings "last confirmed" field to today.
 * Used by the ZIMRA compliance panel — HR clicks Confirm after
 * cross-checking a knob against ZIMRA's schedule.
 */
export async function confirmComplianceField(field: string): Promise<void> {
  await ensurePayrollAdmin();
  const { myCompany } = await import("@/lib/references/server");
  const company = await myCompany();
  if (!company) throw new Error("No company on session.");
  const today = new Date().toISOString().slice(0, 10);
  await frappeCall({
    method: "frappe.client.set_value",
    args: {
      doctype: "Company Payroll Settings",
      name: company,
      fieldname: field,
      value: today,
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll/setup/compliance");
}

/**
 * Write a single Company Payroll Settings field. Called by the
 * inline number cells on the ZIMRA compliance panel; each knob
 * saves on blur. `value` is the raw storage value the field
 * expects (e.g. `nssa_pct` is stored as 0.045 for 4.5% — the
 * panel does the × 100 dance before calling).
 */
export async function updateComplianceKnob(
  field: string,
  value: number,
): Promise<void> {
  await ensurePayrollAdmin();
  const { myCompany } = await import("@/lib/references/server");
  const company = await myCompany();
  if (!company) throw new Error("No company on session.");
  await frappeCall({
    method: "frappe.client.set_value",
    args: {
      doctype: "Company Payroll Settings",
      name: company,
      fieldname: field,
      value,
    },
    as: "user",
    verb: "POST",
  });
  revalidatePath("/payroll/setup/compliance");
  revalidatePath("/payroll/setup/settings");
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
