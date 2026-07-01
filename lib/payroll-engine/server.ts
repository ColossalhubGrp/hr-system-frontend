import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";
import type {
  PayRunRow,
  PayStubRow,
  PayRunStatus,
  TaxRule,
  TaxBracket,
} from "./types";

/**
 * Server-side adapter — turns Frappe's Payroll Entry / Salary Slip /
 * Payroll Tax Rule into the Rippling-flow PayRun / PayStub / TaxRule
 * types the wizard + landing page consume.
 *
 * Multi-tenant: every query is scoped to the current user's Company.
 * Reads forward the sid (`as: "user"`) so Frappe row perms apply.
 */

// ── Tax rules ───────────────────────────────────────────────────────

export async function getTaxRules(company?: string): Promise<TaxRule[]> {
  const co = company ?? (await myCompany());
  if (!co) return [];
  try {
    const res = await frappeCall<{
      message?: Array<Record<string, unknown>>;
    } | Array<Record<string, unknown>>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Tax Rule",
        filters: { company: co, is_active: 1 },
        fields: [
          "name",
          "code",
          "rate_kind",
          "rate_value",
          "wage_base",
          "brackets",
          "applies_to",
          "jurisdiction",
          "region",
          "pay_periods_per_year",
          "is_active",
          "company",
        ],
        limit_page_length: 0,
      },
      as: "user",
    });
    const rows = Array.isArray(res) ? res : (res?.message ?? []);
    return rows.map(toTaxRule);
  } catch {
    return [];
  }
}

function toTaxRule(r: Record<string, unknown>): TaxRule {
  let brackets: TaxBracket[] | null = null;
  const raw = r.brackets;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        brackets = parsed.map((b) => ({
          up_to: Number(b.up_to ?? 0),
          rate: Number(b.rate ?? 0),
        }));
      }
    } catch {
      brackets = null;
    }
  }
  return {
    name: String(r.name ?? ""),
    code: (r.code as string) || null,
    rate_kind: (r.rate_kind as TaxRule["rate_kind"]) ?? "FLAT",
    rate_value: Number(r.rate_value ?? 0),
    wage_base: Number(r.wage_base ?? 0),
    brackets,
    applies_to: (r.applies_to as TaxRule["applies_to"]) ?? "employee",
    jurisdiction: (r.jurisdiction as string) || null,
    region: (r.region as string) || null,
    pay_periods_per_year: Number(r.pay_periods_per_year ?? 12),
    is_active: r.is_active === 1 || r.is_active === true ? 1 : 0,
    company: (r.company as string) || null,
  };
}

// ── Pay runs (mapped from Payroll Entry) ───────────────────────────

const PAYROLL_ENTRY_FIELDS = [
  "name",
  "company",
  "start_date",
  "end_date",
  "posting_date",
  "payroll_frequency",
  "status",
  "number_of_employees",
];

const FRAPPE_TO_RUN_STATUS: Record<string, PayRunStatus> = {
  Draft: "DRAFT",
  Submitted: "APPROVED", // submitted = approved in our model
  Cancelled: "ARCHIVED",
  Queued: "PENDING_APPROVAL",
  Failed: "FAILED",
};

export async function listPayRuns(opts?: {
  status?: PayRunStatus | "all";
}): Promise<PayRunRow[]> {
  const company = await myCompany();
  if (!company) return [];
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Payroll Entry",
        filters: { company },
        fields: PAYROLL_ENTRY_FIELDS,
        order_by: "posting_date desc",
        limit_page_length: 100,
      },
      as: "user",
    });
    // frappeCall already unwraps `.message`; an inline array IS the
    // unwrapped result. Defensive handling for both shapes.
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    let mapped = rows.map(toPayRunRow);
    if (opts?.status && opts.status !== "all") {
      mapped = mapped.filter((r) => bucketize(r.status) === opts.status);
    }
    return mapped;
  } catch (err) {
    console.error("[payroll] listPayRuns failed:", err);
    return [];
  }
}

function toPayRunRow(r: Record<string, unknown>): PayRunRow {
  const startDate = String(r.start_date ?? "");
  const endDate = String(r.end_date ?? "");
  const postingDate = String(r.posting_date ?? "");
  const status =
    FRAPPE_TO_RUN_STATUS[String(r.status ?? "Draft")] ?? "DRAFT";
  return {
    id: String(r.name ?? ""),
    company: String(r.company ?? ""),
    label: humanLabel(startDate, endDate, postingDate),
    scheduleType: String(r.payroll_frequency ?? ""),
    periodStart: startDate,
    periodEnd: endDate,
    payDate: postingDate,
    approveBy: postingDate, // ERPNext doesn't carry a separate approveBy
    status,
    isOffCycle: false, // off-cycle = future doctype work (see TODO in P3)
    numberOfEmployees: Number(r.number_of_employees ?? 0),
    totalGrossPay: null,
    totalNetPay: null,
  };
}

function humanLabel(start: string, end: string, posting: string): string {
  if (start && end) return `${start} – ${end}`;
  if (posting) return `Pay run · ${posting}`;
  return "Pay run";
}

/** Bucket statuses into the four landing-page tabs. */
function bucketize(s: PayRunStatus): PayRunStatus | "UPCOMING" {
  if (s === "PAID") return "PAID";
  if (s === "ARCHIVED") return "ARCHIVED";
  if (s === "FAILED") return "FAILED";
  return "UPCOMING";
}

// ── Pay stubs (mapped from Salary Slip) ────────────────────────────

export async function listPayStubsForRun(payRunId: string): Promise<PayStubRow[]> {
  const company = await myCompany();
  if (!company) return [];
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        filters: { payroll_entry: payRunId, company },
        fields: [
          "name",
          "employee",
          "employee_name",
          "gross_pay",
          "net_pay",
          "total_deduction",
          "status",
        ],
        order_by: "employee_name",
        limit_page_length: 1000,
      },
      as: "user",
    });
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    return rows.map((r) => ({
      id: String(r.name ?? ""),
      payRunId,
      employee: String(r.employee ?? ""),
      employeeName: String(r.employee_name ?? r.employee ?? ""),
      included: String(r.status ?? "Draft") !== "Cancelled",
      grossPay: Number(r.gross_pay ?? 0),
      netPay: Number(r.net_pay ?? 0),
      totalDeduction: Number(r.total_deduction ?? 0),
      status: String(r.status ?? "Draft"),
      missingInfo: [],
    }));
  } catch {
    return [];
  }
}

// ── Self-service: one employee's payslip history ──────────────────

export type EmployeePayslip = {
  id: string;
  payDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  status: string;
};

/**
 * Pay slips for ONE employee, newest first. Used by the Salary tab on the
 * Employee detail page (self-service + payroll-reviewer view), NOT by
 * the per-run /payroll/[id] page which goes through listPayStubsForRun.
 */
export async function listPayslipsForEmployee(
  employee: string,
  limit = 12,
): Promise<EmployeePayslip[]> {
  const company = await myCompany();
  if (!company) return [];
  try {
    const res = await frappeCall<
      Array<Record<string, unknown>> | { message?: Array<Record<string, unknown>> }
    >({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        filters: { employee, company },
        fields: [
          "name",
          "posting_date",
          "start_date",
          "end_date",
          "gross_pay",
          "net_pay",
          "total_deduction",
          "status",
        ],
        order_by: "posting_date desc",
        limit_page_length: limit,
      },
      as: "user",
    });
    const rows = Array.isArray(res)
      ? res
      : ((res?.message ?? []) as Array<Record<string, unknown>>);
    return rows.map((r) => ({
      id: String(r.name ?? ""),
      payDate: (r.posting_date as string) || null,
      periodStart: (r.start_date as string) || null,
      periodEnd: (r.end_date as string) || null,
      grossPay: Number(r.gross_pay ?? 0),
      totalDeduction: Number(r.total_deduction ?? 0),
      netPay: Number(r.net_pay ?? 0),
      status: String(r.status ?? "Draft"),
    }));
  } catch {
    return [];
  }
}

// ── Action-required detection ──────────────────────────────────────

/**
 * The Rippling landing page surfaces an "Action Required" banner when a
 * Draft/Pending run has any blocked employees. We don't have the missing-
 * info schema on Frappe Employee out of the box, so for v1 we flag any
 * run that's been Draft for > approval-lead-days as needing attention.
 *
 * Once Custom Fields are added to Employee for the critical fields, swap
 * this for a true blocked-count check via missingCriticalInfo().
 */
export async function getBlockedRuns(): Promise<PayRunRow[]> {
  const runs = await listPayRuns();
  return runs.filter(
    (r) =>
      r.status !== "PAID" &&
      r.status !== "ARCHIVED" &&
      r.status === "DRAFT" &&
      daysSince(r.periodEnd) > 4,
  );
}

function daysSince(isoDate: string): number {
  if (!isoDate) return 0;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
