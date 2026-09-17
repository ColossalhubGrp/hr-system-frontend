import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Payroll Run (Belina-flow) data layer.
 *
 *   listPayRuns()                 every period on the company, newest first.
 *                                 Includes payslip count + net_usd total.
 *   listMissingCriticalInfo()     employees blocked from being paid (gates
 *                                 by ZW statutory IDs + bank account).
 *   getPayRun(name)               one period + counts.
 */

export type PayRunStatus = "OPEN" | "PROCESSED" | "UPDATED";
export type RunType = "MONTHLY" | "BONUS" | "COMMISSION" | "TERMINAL";

export type PayRunRow = {
  name: string;
  period_label: string;
  pay_date: string;
  exchange_rate: number;
  status: PayRunStatus;
  is_off_cycle: 0 | 1 | boolean;
  run_type: RunType;
  payslipCount: number;
  netUsdTotal: number;
  /** For TERMINAL off-cycle runs — the single employee being paid
   *  out. When set, the detail page renders the specialized
   *  Termination view (§14 preview + Process) instead of the
   *  whole-roster employees table. */
  target_employee?: string | null;
};

export type MissingCriticalRow = {
  employee: string;          // Employee.name (HR-EMP-xxx)
  employee_name: string;
  missing: string[];
  /** Underlying Employee fieldnames matching the labels in `missing`,
   *  in the same order. The banner passes these to the edit page's
   *  `?fix=` param so the form can highlight the exact inputs and
   *  jump to the right tab. */
  missing_fieldnames: string[];
};

// ── shared helpers ───────────────────────────────────────────────

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
    console.error(`[payruns] listDocs ${doctype} failed:`, err);
    return [];
  }
}

// ── reads ────────────────────────────────────────────────────────

export async function listPayRuns(): Promise<PayRunRow[]> {
  const company = await myCompany();
  if (!company) return [];

  const runs = await listDocs<Record<string, unknown>>("Payroll Run", {
    fields: [
      "name", "period_label", "pay_date", "exchange_rate",
      "status", "is_off_cycle", "run_type",
      "period_year", "period_month",
    ],
    filters: { company },
    orderBy: "period_year desc, period_month desc, pay_date desc",
    limit: 200,
  });
  if (runs.length === 0) return [];

  // Pull all payslips for these runs in one query and roll up per-run.
  const runNames = runs.map((r) => r.name as string);
  const slips = await listDocs<Record<string, unknown>>("Payroll Run Payslip", {
    fields: ["payroll_run", "net_usd"],
    filters: { payroll_run: ["in", runNames] },
    limit: 5000,
  });
  const stats = new Map<string, { count: number; net: number }>();
  for (const s of slips) {
    const key = s.payroll_run as string;
    const prev = stats.get(key) ?? { count: 0, net: 0 };
    prev.count += 1;
    prev.net += Number(s.net_usd ?? 0);
    stats.set(key, prev);
  }

  return runs.map((r) => {
    const s = stats.get(r.name as string) ?? { count: 0, net: 0 };
    return {
      name: r.name as string,
      period_label: (r.period_label as string) || "",
      pay_date: (r.pay_date as string) || "",
      exchange_rate: Number(r.exchange_rate ?? 0),
      status: ((r.status as string) || "OPEN") as PayRunStatus,
      is_off_cycle: Boolean(r.is_off_cycle) ? 1 : 0,
      run_type: ((r.run_type as string) || "MONTHLY") as RunType,
      payslipCount: s.count,
      netUsdTotal: s.net,
    };
  });
}

export async function listMissingCriticalInfo(): Promise<MissingCriticalRow[]> {
  const company = await myCompany();
  if (!company) return [];
  // We try the Belina-shaped Custom Fields first; if a bench is on
  // pre-Phase-5 (these fields don't exist yet), we just return [] —
  // the banner stays hidden.
  const fields = [
    "name", "employee_name",
    "national_id", "tax_number", "nssa_number", "bank_account",
  ];
  let rows: Record<string, unknown>[] = [];
  try {
    rows = await listDocs("Employee", {
      fields,
      filters: { company, status: "Active" },
      orderBy: "employee_name asc",
      limit: 2000,
    });
  } catch (err) {
    console.error("[payruns] listMissingCriticalInfo: Employee read failed", err);
    return [];
  }
  return rows
    .map((r) => {
      const missing: string[] = [];
      const fieldnames: string[] = [];
      if (!r.national_id) {
        missing.push("National ID");
        fieldnames.push("national_id");
      }
      const tax = String(r.tax_number ?? "").trim();
      if (!tax || tax === "PENDING") {
        missing.push("ZIMRA tax number");
        fieldnames.push("tax_number");
      }
      const nssa = String(r.nssa_number ?? "").trim();
      if (!nssa || nssa === "PENDING") {
        missing.push("NSSA number");
        fieldnames.push("nssa_number");
      }
      if (!r.bank_account) {
        missing.push("Bank account");
        fieldnames.push("bank_account");
      }
      return {
        employee: r.name as string,
        employee_name: (r.employee_name as string) || (r.name as string),
        missing,
        missing_fieldnames: fieldnames,
      };
    })
    .filter((r) => r.missing.length > 0);
}

// ── per-run reads (detail page) ──────────────────────────────────

export type CapturedTxn = {
  code: string;
  kind: "EARNING" | "DEDUCTION";
  currency: string;
  amount: number;
};

export type PayrollClass = "SALARIED" | "HOURLY" | "CONTRACTOR";

/** Per-employee-per-run wizard state, populated from
 *  `Payroll Wizard Entry` on the backend. All fields are optional /
 *  zero-default; the wizard's inline cells read + write these. */
export type WizardEntry = {
  /** Rippling-style include tick. False = HR unchecked this employee
   *  from the run and the engine skips them at process time.
   *  Defaults to true. */
  include_in_run: boolean;
  salary_adjustment_usd: number;
  hourly_rate_usd: number;
  hours_worked: number;
  overtime_hours: number;
  /** How much OT hours pay per hour, as a multiple of the hourly
   *  rate. Zim weekday default is 1.5; weekend / public holidays
   *  are commonly 2.0; some NECs publish their own. Editable
   *  per-row so HR can override for a specific run (e.g. a
   *  holiday-heavy period). */
  overtime_multiplier: number;
  /** Multiplier for weekend hours (Sat/Sun work). Zim default 2×;
   *  per-row overridable, falls back to company setting. */
  weekend_multiplier: number;
  /** Multiplier for gazetted public-holiday hours. Default 2×. */
  holiday_multiplier: number;
  contractor_flat_usd: number;
};

const DEFAULT_OT_MULTIPLIER = 1.5;
const DEFAULT_WEEKEND_MULTIPLIER = 2.0;
const DEFAULT_HOLIDAY_MULTIPLIER = 2.0;

const EMPTY_WIZARD_ENTRY: WizardEntry = {
  include_in_run: true,
  salary_adjustment_usd: 0,
  hourly_rate_usd: 0,
  hours_worked: 0,
  overtime_hours: 0,
  overtime_multiplier: DEFAULT_OT_MULTIPLIER,
  weekend_multiplier: DEFAULT_WEEKEND_MULTIPLIER,
  holiday_multiplier: DEFAULT_HOLIDAY_MULTIPLIER,
  contractor_flat_usd: 0,
};

export type EmployeeForRun = {
  employee: string;
  employee_name: string;
  job_title: string | null;
  nec_industry: string | null;
  payroll_class: PayrollClass;
  basic_usd: number;
  basic_zig: number;
  /** Employee master's fallback hourly rate. Wizard entry can
   *  override for a specific run without touching the employee. */
  hourly_rate_usd: number;
  /** Contractors only. When false and payroll_class = CONTRACTOR,
   *  the engine withholds 10% WHT on their flat 1099 per ZIMRA §80.
   *  Wizard surfaces a red "⚠ WHT 10%" chip so HR sees the deduction
   *  before Approve. */
  has_tax_clearance: boolean;
  /** Human labels for the missing critical fields — used for display
   *  ("Excluded — missing 2", tooltip listing what's missing). */
  missing: string[];
  /** Parallel array of Employee fieldnames, same length + order as
   *  `missing`. The wizard's Fix-profile link forwards these on the
   *  URL as `?fix=` so the employee form can highlight + scroll to
   *  the right inputs. */
  missing_fieldnames: string[];
  /** Individual transactions captured on this run — HR wants to see
   *  *what* got captured, not just a count, so the OPEN table renders
   *  a chip per row. */
  captured_txns: CapturedTxn[];
  captured_earn_usd: number;
  captured_earn_zig: number;
  captured_deduct_usd: number;
  captured_deduct_zig: number;
  /** Wizard entry — the class-aware inputs HR keys into the Run
   *  Payroll wizard. Salaried uses salary_adjustment_usd; hourly
   *  uses hourly_rate_usd + hours_worked + overtime_hours; contractor
   *  uses contractor_flat_usd. */
  wiz: WizardEntry;
  /** Approved-timesheet snapshot from /payroll/[id]/timesheets, if
   *  any. When present, Hourly wizard cells lock and read from
   *  here; salaried gets an auto-OT hint computed from
   *  overtime_hours. `null` = no approved timesheet yet (wizard
   *  falls back to manual entry). */
  timesheet: {
    regular_hours: number;
    overtime_hours: number;
    weekend_hours: number;
    holiday_hours: number;
    expected_hours: number;
    source: string;
    /** Suspicious-time flags surfaced from Payroll Timesheet.
     *  Wizard row shows an amber-triangle warning when non-empty;
     *  clicking it takes HR to /payroll/[id]/timesheets to review. */
    flag_codes: string[];
  } | null;
};

export type EmployeeSlip = {
  name: string;
  run: string;
  period_label: string;
  pay_date: string;
  is_off_cycle: boolean;
  run_type: RunType;
  gross_usd: number;
  gross_zig: number;
  paye_usd: number;
  paye_zig: number;
  nssa_employee: number;
  net_usd: number;
  net_zig: number;
};

/**
 * Per-employee payslip history, newest first. Joins Payroll Run
 * Payslip against Payroll Run to lift the period label + pay date.
 * Used by the Payroll tab on `/employee/[id]`.
 */
export async function listPayslipsForEmployee(
  employee: string,
  limit = 12,
): Promise<EmployeeSlip[]> {
  // Payroll Run Payslip is a standalone doctype (not a child table) —
  // link back to the run via the `payroll_run` field, not `parent`.
  const slips = await listDocs<{
    name: string;
    payroll_run: string;
    gross_usd: number;
    gross_zig: number;
    paye_usd: number;
    paye_zig: number;
    nssa_employee: number;
    net_usd: number;
    net_zig: number;
  }>("Payroll Run Payslip", {
    fields: [
      "name", "payroll_run",
      "gross_usd", "gross_zig",
      "paye_usd", "paye_zig",
      "nssa_employee",
      "net_usd", "net_zig",
    ],
    filters: { employee },
    orderBy: "creation desc",
    limit,
  });
  if (slips.length === 0) return [];
  const runNames = Array.from(new Set(slips.map((s) => s.payroll_run)));
  const runs = await listDocs<{
    name: string;
    period_label: string;
    pay_date: string;
    is_off_cycle: 0 | 1 | boolean;
    run_type: RunType;
  }>("Payroll Run", {
    fields: ["name", "period_label", "pay_date", "is_off_cycle", "run_type"],
    filters: { name: ["in", runNames] },
    orderBy: "pay_date desc",
    limit: runNames.length,
  });
  const runByName = new Map(runs.map((r) => [r.name, r]));
  return slips.map((s) => {
    const r = runByName.get(s.payroll_run);
    return {
      name: s.name,
      run: s.payroll_run,
      period_label: r?.period_label ?? s.payroll_run,
      pay_date: r?.pay_date ?? "",
      is_off_cycle: Boolean(r?.is_off_cycle),
      run_type: (r?.run_type ?? "MONTHLY") as RunType,
      gross_usd: Number(s.gross_usd ?? 0),
      gross_zig: Number(s.gross_zig ?? 0),
      paye_usd: Number(s.paye_usd ?? 0),
      paye_zig: Number(s.paye_zig ?? 0),
      nssa_employee: Number(s.nssa_employee ?? 0),
      net_usd: Number(s.net_usd ?? 0),
      net_zig: Number(s.net_zig ?? 0),
    };
  });
}

export type RunPayslip = {
  name: string;
  employee: string;
  employee_name: string;
  gross_usd: number;
  gross_zig: number;
  paye_usd: number;
  paye_zig: number;
  /** ZIMRA credits (elderly + disabled + medical) subtracted from
   *  combined PAYE before AIDS Levy. USD-side only (credits are set
   *  by ZIMRA in USD). */
  tax_credits_usd: number;
  aids_usd: number;
  aids_zig: number;
  nssa_employee: number;
  nssa_employer: number;
  pension_usd: number;
  zimdef: number;
  nec_dues: number;
  medical_aid: number;
  other_deduct_usd: number;
  other_deduct_zig: number;
  net_usd: number;
  net_zig: number;
};

/**
 * Pull every active employee on the run's company + flag missing
 * critical info + count their captured transactions on this run.
 * Used by the OPEN-view employees table on the detail page.
 */
export async function listEmployeesForRun(
  payrollRun: string,
): Promise<EmployeeForRun[]> {
  const run = await getPayRun(payrollRun);
  if (!run) return [];
  const company = await myCompany();
  if (!company) return [];

  const rows = await listDocs<Record<string, unknown>>("Employee", {
    fields: [
      "name", "employee_name",
      "job_title", "nec_industry",
      // Belina Custom Fields (Phase 5 adds them). Until then, all 0/null.
      "basic_usd", "basic_zig",
      "national_id", "tax_number", "nssa_number", "bank_account",
      // Payroll wizard classification + hourly-rate fallback. Both are
      // custom fields seeded by patches; missing values treated as
      // SALARIED/0 downstream.
      "payroll_class", "hourly_rate_usd", "has_tax_clearance",
    ],
    filters: { company, status: "Active" },
    orderBy: "employee_name asc",
    limit: 2000,
  });

  const txnsByEmp = new Map<string, CapturedTxn[]>();
  for (const t of await listDocs<{
    employee: string;
    kind: "EARNING" | "DEDUCTION";
    code: string;
    currency: string;
    amount: number;
  }>("Payroll Transaction", {
    fields: ["employee", "kind", "code", "currency", "amount"],
    filters: { payroll_run: payrollRun },
    orderBy: "kind asc, code asc",
    limit: 5000,
  })) {
    const list = txnsByEmp.get(t.employee) ?? [];
    list.push({
      code: t.code,
      kind: t.kind,
      currency: t.currency,
      amount: Number(t.amount ?? 0),
    });
    txnsByEmp.set(t.employee, list);
  }

  // Pull the wizard entries for this run in one shot. Server returns
  // an empty list if the doctype isn't installed yet (fresh site
  // before the patch runs) — the wizard falls back to empty per
  // employee, which shows zeros in the inline cells.
  const wizByEmp = new Map<string, WizardEntry>();
  try {
    const { frappeCall } = await import("@/lib/frappe/client");
    const res = await frappeCall<{ entries: Array<Record<string, unknown>> } | { message?: { entries: Array<Record<string, unknown>> } }>({
      method: "recruitment_app.api.approvals.admin_list_wizard_entries",
      args: { payroll_run: payrollRun },
      as: "user",
    });
    const inner =
      (res as { message?: { entries: Array<Record<string, unknown>> } }).message ?? res;
    const entries = (inner as { entries?: Array<Record<string, unknown>> }).entries ?? [];
    for (const e of entries) {
      wizByEmp.set(String(e.employee), {
        // Absent field (fresh site pre-patch) → default included.
        include_in_run: e.include_in_run === undefined || e.include_in_run === null
          ? true
          : Boolean(e.include_in_run),
        salary_adjustment_usd: Number(e.salary_adjustment_usd ?? 0),
        hourly_rate_usd: Number(e.hourly_rate_usd ?? 0),
        hours_worked: Number(e.hours_worked ?? 0),
        overtime_hours: Number(e.overtime_hours ?? 0),
        overtime_multiplier: Number(e.overtime_multiplier ?? 0) || DEFAULT_OT_MULTIPLIER,
        weekend_multiplier: Number(e.weekend_multiplier ?? 0) || DEFAULT_WEEKEND_MULTIPLIER,
        holiday_multiplier: Number(e.holiday_multiplier ?? 0) || DEFAULT_HOLIDAY_MULTIPLIER,
        contractor_flat_usd: Number(e.contractor_flat_usd ?? 0),
      });
    }
  } catch {
    /* doctype missing / role-gated — leave map empty */
  }

  // Approved timesheets — same treatment. Only approved rows flow
  // into the wizard (matches what the engine reads at process time).
  const tsByEmp = new Map<
    string,
    EmployeeForRun["timesheet"]
  >();
  try {
    const { frappeCall } = await import("@/lib/frappe/client");
    const res = await frappeCall<
      | { rows: Array<Record<string, unknown>> }
      | { message?: { rows: Array<Record<string, unknown>> } }
    >({
      method: "recruitment_app.api.approvals.admin_list_timesheets",
      args: { payroll_run: payrollRun },
      as: "user",
    });
    const inner =
      (res as { message?: { rows: Array<Record<string, unknown>> } }).message ?? res;
    const tsRows = (inner as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    for (const t of tsRows) {
      if (!t.approved) continue;
      let flagCodes: string[] = [];
      try {
        const parsed = t.flags_json
          ? JSON.parse(String(t.flags_json))
          : [];
        if (Array.isArray(parsed)) {
          flagCodes = parsed
            .map((f) => String((f as { code?: unknown }).code ?? ""))
            .filter(Boolean);
        }
      } catch {
        /* ignore malformed flags */
      }
      tsByEmp.set(String(t.employee), {
        regular_hours: Number(t.regular_hours ?? 0),
        overtime_hours: Number(t.overtime_hours ?? 0),
        weekend_hours: Number(t.weekend_hours ?? 0),
        holiday_hours: Number(t.holiday_hours ?? 0),
        expected_hours: Number(t.expected_hours ?? 0),
        source: String(t.source ?? "MANUAL"),
        flag_codes: flagCodes,
      });
    }
  } catch {
    /* doctype missing / role-gated — leave map empty */
  }

  return rows.map((r) => {
    const missing: string[] = [];
    const missing_fieldnames: string[] = [];
    if (!r.national_id) {
      missing.push("National ID");
      missing_fieldnames.push("national_id");
    }
    const tax = String(r.tax_number ?? "").trim();
    if (!tax || tax === "PENDING") {
      missing.push("ZIMRA tax number");
      missing_fieldnames.push("tax_number");
    }
    const nssa = String(r.nssa_number ?? "").trim();
    if (!nssa || nssa === "PENDING") {
      missing.push("NSSA number");
      missing_fieldnames.push("nssa_number");
    }
    if (!r.bank_account) {
      missing.push("Bank account");
      missing_fieldnames.push("bank_account");
    }
    const captured = txnsByEmp.get(r.name as string) ?? [];
    let earnUsd = 0, earnZig = 0, deductUsd = 0, deductZig = 0;
    for (const t of captured) {
      if (t.kind === "EARNING") {
        if (t.currency === "USD") earnUsd += t.amount;
        else if (t.currency === "ZIG") earnZig += t.amount;
      } else {
        if (t.currency === "USD") deductUsd += t.amount;
        else if (t.currency === "ZIG") deductZig += t.amount;
      }
    }
    const cls: PayrollClass = ((): PayrollClass => {
      const raw = String(r.payroll_class ?? "SALARIED").toUpperCase();
      return raw === "HOURLY" || raw === "CONTRACTOR" ? (raw as PayrollClass) : "SALARIED";
    })();
    const empHourlyRate = Number(r.hourly_rate_usd ?? 0);
    const storedWiz = wizByEmp.get(r.name as string);
    const wiz: WizardEntry = storedWiz
      ? {
          ...storedWiz,
          // Fall back to Employee.hourly_rate_usd when no per-run
          // override — HR only has to key the rate once per hire.
          hourly_rate_usd: storedWiz.hourly_rate_usd || empHourlyRate,
        }
      : { ...EMPTY_WIZARD_ENTRY, hourly_rate_usd: empHourlyRate };
    return {
      employee: r.name as string,
      employee_name: (r.employee_name as string) || (r.name as string),
      job_title: (r.job_title as string) || null,
      nec_industry: (r.nec_industry as string) || null,
      payroll_class: cls,
      basic_usd: Number(r.basic_usd ?? 0),
      basic_zig: Number(r.basic_zig ?? 0),
      hourly_rate_usd: empHourlyRate,
      has_tax_clearance: Boolean(r.has_tax_clearance),
      missing,
      missing_fieldnames,
      captured_txns: captured,
      captured_earn_usd: earnUsd,
      captured_earn_zig: earnZig,
      captured_deduct_usd: deductUsd,
      captured_deduct_zig: deductZig,
      wiz,
      timesheet: tsByEmp.get(r.name as string) ?? null,
    };
  });
}

/**
 * Pull all payslips on this run, sorted highest-net first (Belina
 * default). Used by the PROCESSED-view register.
 */
export async function listPayslipsForRun(
  payrollRun: string,
): Promise<RunPayslip[]> {
  const slips = await listDocs<Record<string, unknown>>("Payroll Run Payslip", {
    fields: [
      "name", "employee", "employee_name",
      "gross_usd", "gross_zig",
      "paye_usd", "paye_zig",
      "tax_credits_usd",
      "aids_usd", "aids_zig",
      "nssa_employee", "nssa_employer",
      "pension_usd", "zimdef",
      "nec_dues", "medical_aid",
      "other_deduct_usd", "other_deduct_zig",
      "net_usd", "net_zig",
    ],
    filters: { payroll_run: payrollRun },
    orderBy: "net_usd desc",
    limit: 5000,
  });
  return slips.map((s) => ({
    name: s.name as string,
    employee: s.employee as string,
    employee_name: (s.employee_name as string) || (s.employee as string),
    gross_usd: Number(s.gross_usd ?? 0),
    gross_zig: Number(s.gross_zig ?? 0),
    paye_usd: Number(s.paye_usd ?? 0),
    paye_zig: Number(s.paye_zig ?? 0),
    tax_credits_usd: Number(s.tax_credits_usd ?? 0),
    aids_usd: Number(s.aids_usd ?? 0),
    aids_zig: Number(s.aids_zig ?? 0),
    nssa_employee: Number(s.nssa_employee ?? 0),
    nssa_employer: Number(s.nssa_employer ?? 0),
    pension_usd: Number(s.pension_usd ?? 0),
    zimdef: Number(s.zimdef ?? 0),
    nec_dues: Number(s.nec_dues ?? 0),
    medical_aid: Number(s.medical_aid ?? 0),
    other_deduct_usd: Number(s.other_deduct_usd ?? 0),
    other_deduct_zig: Number(s.other_deduct_zig ?? 0),
    net_usd: Number(s.net_usd ?? 0),
    net_zig: Number(s.net_zig ?? 0),
  }));
}

export type PrevRunSnapshot = {
  gross_usd: number;
  gross_zig: number;
  paye_usd: number;
  nssa_ee_usd: number;
  net_usd: number;
  net_zig: number;
};

/**
 * Previous-period payslip snapshot per employee — net + gross (USD) +
 * total net + full breakdown. Net drives the register's "vs previous"
 * delta after processing. Gross powers the OPEN-view delta so HR can
 * eyeball a gross-to-gross change (this run's basic + captured txns
 * vs last run's gross) before hitting Process. `snapshotByEmployee`
 * carries the full breakdown the wizard's Preview step compares
 * against. "Previous" = most recent run on this company with
 * pay_date < the current run's.
 */
export async function listPreviousRunNetMap(
  payrollRun: string,
): Promise<{
  byEmployee: Map<string, number>;
  grossByEmployee: Map<string, number>;
  snapshotByEmployee: Map<string, PrevRunSnapshot>;
  total: number;
  label: string | null;
}> {
  const empty = {
    byEmployee: new Map<string, number>(),
    grossByEmployee: new Map<string, number>(),
    snapshotByEmployee: new Map<string, PrevRunSnapshot>(),
    total: 0,
    label: null as string | null,
  };
  const company = await myCompany();
  if (!company) return empty;

  const cur = await listDocs<{ pay_date: string }>("Payroll Run", {
    fields: ["pay_date"],
    filters: { name: payrollRun },
    limit: 1,
  });
  if (!cur[0]?.pay_date) return empty;

  const previous = await listDocs<{ name: string; period_label: string }>("Payroll Run", {
    fields: ["name", "period_label"],
    filters: {
      company,
      pay_date: ["<", cur[0].pay_date],
      name: ["!=", payrollRun],
    },
    orderBy: "pay_date desc",
    limit: 1,
  });
  if (!previous[0]) return empty;

  const prevSlips = await listDocs<{
    employee: string;
    net_usd: number;
    net_zig: number;
    gross_usd: number;
    gross_zig: number;
    paye_usd: number;
    nssa_employee: number;
  }>("Payroll Run Payslip", {
    fields: [
      "employee", "net_usd", "net_zig", "gross_usd", "gross_zig",
      "paye_usd", "nssa_employee",
    ],
    filters: { payroll_run: previous[0].name },
    limit: 5000,
  });
  const byEmployee = new Map<string, number>();
  const grossByEmployee = new Map<string, number>();
  const snapshotByEmployee = new Map<string, PrevRunSnapshot>();
  let total = 0;
  for (const s of prevSlips) {
    const v = Number(s.net_usd ?? 0);
    byEmployee.set(s.employee, v);
    grossByEmployee.set(s.employee, Number(s.gross_usd ?? 0));
    snapshotByEmployee.set(s.employee, {
      gross_usd: Number(s.gross_usd ?? 0),
      gross_zig: Number(s.gross_zig ?? 0),
      paye_usd: Number(s.paye_usd ?? 0),
      nssa_ee_usd: Number(s.nssa_employee ?? 0),
      net_usd: v,
      net_zig: Number(s.net_zig ?? 0),
    });
    total += v;
  }
  return {
    byEmployee,
    grossByEmployee,
    snapshotByEmployee,
    total,
    label: previous[0].period_label,
  };
}

// ── Payslip detail (printable page) ──────────────────────────────

export type PayslipDetail = {
  run: { name: string; period_label: string; pay_date: string; exchange_rate: number };
  company: {
    company_name: string;
    legal_name: string | null;
    address: string | null;
    bp_number: string | null;
    nssa_employer_no: string | null;
  };
  employee: {
    name: string;
    employee_name: string;
    job_title: string | null;
    national_id: string | null;
    tax_number: string | null;
    nssa_number: string | null;
    nec_industry: string | null;
    bank_name: string | null;
    bank_account: string | null;
    basic_usd: number;
    basic_zig: number;
    pension_pct: number;
  };
  slip: RunPayslip;
  earnings: Array<{ name: string; code: string; currency: string; amount: number; taxable: 0 | 1 | boolean }>;
  deductions: Array<{ name: string; code: string; currency: string; amount: number; taxable: 0 | 1 | boolean }>;
};

export async function getPayslipDetail(
  payrollRun: string,
  employee: string,
): Promise<PayslipDetail | null> {
  const runRows = await listDocs<Record<string, unknown>>("Payroll Run", {
    fields: ["name", "period_label", "pay_date", "exchange_rate", "company"],
    filters: { name: payrollRun },
    limit: 1,
  });
  if (!runRows[0]) return null;
  const run = runRows[0];
  const company = run.company as string;

  const slipRows = await listDocs<Record<string, unknown>>("Payroll Run Payslip", {
    fields: [
      "name", "employee", "employee_name",
      "gross_usd", "gross_zig",
      "paye_usd", "paye_zig",
      "tax_credits_usd",
      "aids_usd", "aids_zig",
      "nssa_employee", "nssa_employer",
      "pension_usd", "zimdef",
      "nec_dues", "medical_aid",
      "other_deduct_usd", "other_deduct_zig",
      "net_usd", "net_zig",
    ],
    filters: { payroll_run: payrollRun, employee },
    limit: 1,
  });
  if (!slipRows[0]) return null;
  const slipRow = slipRows[0];

  // Company Payroll Settings (Belina-shaped)
  const cps = await listDocs<Record<string, unknown>>("Company Payroll Settings", {
    fields: ["name", "legal_name", "company_address", "bp_number", "nssa_employer_no"],
    filters: { name: company },
    limit: 1,
  });
  const c = cps[0] ?? {};

  // Employee statutory + bank. `frappe.client.get_list` blocks any
  // field that isn't marked `in_list_view=1` — that's a hard 417 on
  // Employee.bank_name (native field, not in list view). Using
  // `frappe.client.get` returns the full doc without that allowlist.
  let e: Record<string, unknown> = {};
  try {
    const doc = await frappeCall<Record<string, unknown>>({
      method: "frappe.client.get",
      args: { doctype: "Employee", name: employee },
      as: "user",
    });
    e = doc ?? {};
  } catch (err) {
    console.error("[payruns] getPayslipDetail Employee lookup failed:", err);
  }

  // Transactions captured for this slip
  const txnRows = await listDocs<Record<string, unknown>>("Payroll Transaction", {
    fields: ["name", "kind", "code", "currency", "amount", "taxable"],
    filters: { payroll_run: payrollRun, employee },
    limit: 200,
  });

  return {
    run: {
      name: run.name as string,
      period_label: (run.period_label as string) || "",
      pay_date: (run.pay_date as string) || "",
      exchange_rate: Number(run.exchange_rate ?? 0),
    },
    company: {
      company_name: company,
      legal_name: (c.legal_name as string) || null,
      address: (c.company_address as string) || null,
      bp_number: (c.bp_number as string) || null,
      nssa_employer_no: (c.nssa_employer_no as string) || null,
    },
    employee: {
      name: (e.name as string) || employee,
      employee_name: (e.employee_name as string) || employee,
      job_title: (e.job_title as string) || null,
      national_id: (e.national_id as string) || null,
      tax_number: (e.tax_number as string) || null,
      nssa_number: (e.nssa_number as string) || null,
      nec_industry: (e.nec_industry as string) || null,
      bank_name: (e.bank_name as string) || null,
      bank_account: (e.bank_account as string) || null,
      basic_usd: Number(e.basic_usd ?? 0),
      basic_zig: Number(e.basic_zig ?? 0),
      pension_pct: Number(e.pension_pct ?? 0),
    },
    slip: {
      name: slipRow.name as string,
      employee: slipRow.employee as string,
      employee_name: (slipRow.employee_name as string) || "",
      gross_usd: Number(slipRow.gross_usd ?? 0),
      gross_zig: Number(slipRow.gross_zig ?? 0),
      paye_usd: Number(slipRow.paye_usd ?? 0),
      paye_zig: Number(slipRow.paye_zig ?? 0),
      tax_credits_usd: Number(slipRow.tax_credits_usd ?? 0),
      aids_usd: Number(slipRow.aids_usd ?? 0),
      aids_zig: Number(slipRow.aids_zig ?? 0),
      nssa_employee: Number(slipRow.nssa_employee ?? 0),
      nssa_employer: Number(slipRow.nssa_employer ?? 0),
      pension_usd: Number(slipRow.pension_usd ?? 0),
      zimdef: Number(slipRow.zimdef ?? 0),
      nec_dues: Number(slipRow.nec_dues ?? 0),
      medical_aid: Number(slipRow.medical_aid ?? 0),
      other_deduct_usd: Number(slipRow.other_deduct_usd ?? 0),
      other_deduct_zig: Number(slipRow.other_deduct_zig ?? 0),
      net_usd: Number(slipRow.net_usd ?? 0),
      net_zig: Number(slipRow.net_zig ?? 0),
    },
    earnings: txnRows
      .filter((t) => t.kind === "EARNING")
      .map((t) => ({
        name: t.name as string,
        code: (t.code as string) || "",
        currency: (t.currency as string) || "USD",
        amount: Number(t.amount ?? 0),
        taxable: Boolean(t.taxable) ? 1 : 0,
      })),
    deductions: txnRows
      .filter((t) => t.kind === "DEDUCTION")
      .map((t) => ({
        name: t.name as string,
        code: (t.code as string) || "",
        currency: (t.currency as string) || "USD",
        amount: Number(t.amount ?? 0),
        taxable: Boolean(t.taxable) ? 1 : 0,
      })),
  };
}

export async function getPayRun(name: string): Promise<PayRunRow | null> {
  const rows = await listDocs<Record<string, unknown>>("Payroll Run", {
    fields: [
      "name", "period_label", "pay_date", "exchange_rate",
      "status", "is_off_cycle", "run_type", "target_employee",
    ],
    filters: { name },
    limit: 1,
  });
  if (!rows[0]) return null;
  const r = rows[0];

  const slips = await listDocs<{ net_usd: number }>("Payroll Run Payslip", {
    fields: ["net_usd"],
    filters: { payroll_run: name },
    limit: 5000,
  });
  return {
    name: r.name as string,
    period_label: (r.period_label as string) || "",
    pay_date: (r.pay_date as string) || "",
    exchange_rate: Number(r.exchange_rate ?? 0),
    status: ((r.status as string) || "OPEN") as PayRunStatus,
    is_off_cycle: Boolean(r.is_off_cycle) ? 1 : 0,
    run_type: ((r.run_type as string) || "MONTHLY") as RunType,
    payslipCount: slips.length,
    netUsdTotal: slips.reduce((a, s) => a + Number(s.net_usd ?? 0), 0),
    target_employee: (r.target_employee as string) || null,
  };
}
