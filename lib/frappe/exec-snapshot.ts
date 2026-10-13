import "server-only";
import { frappeCall } from "./client";
import { fetchDashboardSnapshot, type DashboardSnapshot } from "./queries";
import { getAccountingDashboardTotals, type DashboardTotals } from "./accounting-dashboard";

/**
 * Executive /dashboard snapshot — a cross-module summary that
 * replaces the HR-only tile set. Each section is only fetched
 * when the signed-in user has access to that module; the layout
 * passes in the booleans. If the user has access to NOTHING but
 * HR, they still see the HR section — the dashboard just degrades
 * to what they can see.
 *
 * Everything runs through `Promise.allSettled` so one broken
 * backend (missing DocType, perm error) can't take down the
 * entire page.
 */

export type PayrollSummary = {
  /** Gross payroll cost in the current calendar month (sum of
   *  submitted Salary Slips with start_date in this month). */
  monthToDateGross: number;
  /** How many submitted Payroll Entries were posted this month. */
  runsThisMonth: number;
  /** Average gross pay across employees paid in the current month. */
  avgGrossThisMonth: number;
  /** Headline currency symbol seen on the slips (first slip's). */
  currency: string | null;
};

export type AccountingSummary = DashboardTotals & {
  /** The company we scoped totals to — surfaced so the tile can
   *  say "for Rivers Inc" instead of being ambiguous. */
  company: string | null;
};

export type RecruitmentSummary = {
  openJobs: number;
  activeApplicants: number;
};

export type ExecSnapshot = {
  hr: DashboardSnapshot | null;
  payroll: PayrollSummary | null;
  accounting: AccountingSummary | null;
  recruitment: RecruitmentSummary | null;
  asOf: string;
};

export type ExecAccess = {
  hr: boolean;
  payroll: boolean;
  accounting: boolean;
  recruitment: boolean;
};

export async function fetchExecSnapshot(access: ExecAccess): Promise<ExecSnapshot> {
  const [hr, payroll, accounting, recruitment] = await Promise.allSettled([
    access.hr          ? fetchDashboardSnapshot() : Promise.resolve(null),
    access.payroll     ? loadPayrollSummary()     : Promise.resolve(null),
    access.accounting  ? loadAccountingSummary()  : Promise.resolve(null),
    access.recruitment ? loadRecruitmentSummary() : Promise.resolve(null),
  ]);

  return {
    hr: settled(hr),
    payroll: settled(payroll),
    accounting: settled(accounting),
    recruitment: settled(recruitment),
    asOf: new Date().toISOString(),
  };
}

// ─── Payroll ──────────────────────────────────────────────────────────

async function loadPayrollSummary(): Promise<PayrollSummary> {
  // Current calendar month, UTC — matches how start/end are stored
  // on Salary Slip.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
  const monthEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10);

  type Slip = { gross_pay?: number; currency?: string | null };
  const slips = await frappeCall<Slip[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Salary Slip",
      fields: ["gross_pay", "currency"],
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["start_date", ">=", monthStart],
        ["start_date", "<=", monthEnd],
      ]),
      limit_page_length: 0,
    },
    as: "user",
  }).catch(() => [] as Slip[]);

  const runs = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Payroll Entry",
      filters: JSON.stringify([
        ["docstatus", "=", 1],
        ["start_date", ">=", monthStart],
        ["start_date", "<=", monthEnd],
      ]),
    },
    as: "user",
  }).catch(() => 0);

  const total = slips.reduce((a, s) => a + Number(s.gross_pay ?? 0), 0);
  const avg = slips.length > 0 ? total / slips.length : 0;
  const currency = slips.find((s) => s.currency)?.currency ?? null;

  return {
    monthToDateGross: Math.round(total * 100) / 100,
    runsThisMonth: Number(runs ?? 0),
    avgGrossThisMonth: Math.round(avg * 100) / 100,
    currency,
  };
}

// ─── Accounting ───────────────────────────────────────────────────────

async function loadAccountingSummary(): Promise<AccountingSummary> {
  // Scope totals to the default (first) Company. The accounting
  // page itself has a company picker; the exec dashboard is a
  // one-glance view, so we pick the first Company and tag the
  // tile with that name.
  type CompanyRow = { name: string };
  const companies = await frappeCall<CompanyRow[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Company",
      fields: ["name"],
      order_by: "creation asc",
      limit_page_length: 1,
    },
    as: "user",
  }).catch(() => [] as CompanyRow[]);

  const company = companies[0]?.name ?? null;
  if (!company) {
    return {
      totalOutgoingBills: 0,
      totalIncomingBills: 0,
      totalIncomingPayment: 0,
      totalOutgoingPayment: 0,
      accountsReceivableOutstanding: 0,
      accountsPayableOutstanding: 0,
      company: null,
    };
  }

  const totals = await getAccountingDashboardTotals(company).catch(() => ({
    totalOutgoingBills: 0,
    totalIncomingBills: 0,
    totalIncomingPayment: 0,
    totalOutgoingPayment: 0,
    accountsReceivableOutstanding: 0,
    accountsPayableOutstanding: 0,
  }));

  return { ...totals, company };
}

// ─── Recruitment ──────────────────────────────────────────────────────

async function loadRecruitmentSummary(): Promise<RecruitmentSummary> {
  const [openJobs, applicants] = await Promise.all([
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Job Opening",
        filters: JSON.stringify([["status", "=", "Open"]]),
      },
      as: "user",
    }).catch(() => 0),
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: {
        doctype: "Job Applicant",
        filters: JSON.stringify([["status", "not in", ["Rejected", "Hired"]]]),
      },
      as: "user",
    }).catch(() => 0),
  ]);

  return {
    openJobs: Number(openJobs ?? 0),
    activeApplicants: Number(applicants ?? 0),
  };
}

// ─── helpers ──────────────────────────────────────────────────────────

function settled<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}
