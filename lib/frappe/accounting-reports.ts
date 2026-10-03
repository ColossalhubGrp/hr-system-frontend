import "server-only";
import { frappeCall } from "./client";

/**
 * Resolve the Fiscal Year master row whose range contains `date`.
 * ERPNext's Trial Balance / Budget Variance / P&L (filter_based_on =
 * Fiscal Year) throw a validation error (surfaces to us as a 417) when
 * `fiscal_year` is missing or doesn't resolve. Falls back to the first
 * Fiscal Year the user can see if the date isn't inside any FY.
 */
type FiscalYear = {
  name: string;
  year_start_date: string;
  year_end_date: string;
};

export async function fiscalYearForDate(date: string): Promise<FiscalYear | null> {
  const rows = await frappeCall<FiscalYear[]>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Fiscal Year",
      fields: ["name", "year_start_date", "year_end_date"],
      filters: [
        ["year_start_date", "<=", date],
        ["year_end_date", ">=", date],
      ],
      limit_page_length: 1,
    },
  }).catch(() => [] as FiscalYear[]);
  if (rows[0]) return rows[0];

  // Fall back to any FY so the report still runs. Prefer the newest.
  const anyFy = await frappeCall<FiscalYear[]>({
    method: "frappe.client.get_list",
    as: "user",
    args: {
      doctype: "Fiscal Year",
      fields: ["name", "year_start_date", "year_end_date"],
      order_by: "year_end_date desc",
      limit_page_length: 1,
    },
  }).catch(() => [] as FiscalYear[]);
  return anyFy[0] ?? null;
}

/**
 * Wrapper around ERPNext's `frappe.desk.query_report.run` for the
 * canonical financial reports (General Ledger, Trial Balance, P&L,
 * Balance Sheet, Cash Flow, Accounts Receivable/Payable).
 *
 * We call ERPNext's own query-report definitions so numbers match
 * exactly what Desk shows — no re-derivation of fiscal-year edges,
 * cost-center allocations or currency conversions on our side.
 */

export type ReportColumn = {
  fieldname: string;
  label: string;
  fieldtype: string;
  width?: number;
  options?: string;
};

export type ReportResult = {
  columns: ReportColumn[];
  result: Array<Record<string, unknown>>;
  message?: string;
  chart?: Record<string, unknown> | null;
  reportSummary?: Array<Record<string, unknown>>;
};

async function runReport(
  reportName: string,
  filters: Record<string, unknown>,
): Promise<ReportResult> {
  const raw = await frappeCall<Record<string, unknown>>({
    method: "frappe.desk.query_report.run",
    as: "user",
    verb: "POST",
    args: {
      report_name: reportName,
      filters,
      ignore_prepared_report: true,
    },
  });
  const rawColumns = Array.isArray(raw.columns) ? (raw.columns as Array<Record<string, unknown> | string>) : [];
  const columns: ReportColumn[] = rawColumns.map((c) => {
    if (typeof c === "string") {
      // Old-style "Label:Fieldtype/Options:Width" strings
      const [label, typeAndOpt, width] = c.split(":");
      const [fieldtype, options] = (typeAndOpt ?? "").split("/");
      return {
        fieldname: (label ?? "").toLowerCase().replace(/\s+/g, "_"),
        label: label ?? "",
        fieldtype: fieldtype ?? "Data",
        options: options || undefined,
        width: width ? Number(width) : undefined,
      };
    }
    return {
      fieldname: String(c.fieldname ?? c.field ?? ""),
      label: String(c.label ?? ""),
      fieldtype: String(c.fieldtype ?? "Data"),
      width: c.width ? Number(c.width) : undefined,
      options: (c.options as string | undefined) ?? undefined,
    };
  });
  const result = Array.isArray(raw.result) ? (raw.result as Array<Record<string, unknown>>) : [];
  return {
    columns,
    result,
    message: (raw.message as string | undefined) ?? undefined,
    chart: (raw.chart as Record<string, unknown> | null) ?? null,
    reportSummary: (raw.report_summary as Array<Record<string, unknown>> | undefined) ?? undefined,
  };
}

// ── Named-report helpers ─────────────────────────────────────────

export type PeriodFilter = {
  company: string;
  fromDate: string;
  toDate: string;
  finance_book?: string;
  cost_center?: string;
};

export async function generalLedger(opts: PeriodFilter & { account?: string; party?: string }) {
  return runReport("General Ledger", {
    company: opts.company,
    from_date: opts.fromDate,
    to_date: opts.toDate,
    account: opts.account,
    party_type: opts.party ? "Customer" : undefined,
    party: opts.party ? [opts.party] : undefined,
    finance_book: opts.finance_book,
    cost_center: opts.cost_center,
    group_by: "Group by Account",
  });
}

/** Shared gate for the three financial reports that gate on a
 *  Fiscal Year. Replaces the raw 417 "Fiscal Year is required" with
 *  an actionable message, and avoids a wasted round-trip. */
function requireFiscalYear(fy: FiscalYear | null, reportName: string): FiscalYear {
  if (!fy) {
    throw new Error(
      `No Fiscal Year is set up for ${reportName}. Create one under ` +
      `Accounting → Masters → Fiscal Year that covers your date range.`,
    );
  }
  return fy;
}

export async function trialBalance(opts: PeriodFilter) {
  // ERPNext's Trial Balance throws "Fiscal Year is required" when the
  // filter is missing — resolve it from the From date, falling back to
  // any FY the user can see.
  const [fromFy, toFy] = await Promise.all([
    fiscalYearForDate(opts.fromDate),
    fiscalYearForDate(opts.toDate),
  ]);
  const anyFy = requireFiscalYear(fromFy ?? toFy, "Trial Balance");
  return runReport("Trial Balance", {
    company: opts.company,
    from_date: opts.fromDate,
    to_date: opts.toDate,
    fiscal_year: (fromFy ?? toFy)?.name ?? anyFy.name,
    from_fiscal_year: (fromFy ?? toFy)?.name ?? anyFy.name,
    to_fiscal_year: (toFy ?? fromFy)?.name ?? anyFy.name,
    show_zero_values: 0,
    show_unclosed_fy_pl_balances: 1,
    // Trial Balance also calls validate_dates which requires both
    // dates fall inside the resolved FY. Clamp if the user picked a
    // range outside it.
    year_start_date: anyFy.year_start_date,
    year_end_date: anyFy.year_end_date,
  });
}

export async function profitAndLoss(opts: PeriodFilter & { periodicity?: string }) {
  // P&L / Balance Sheet / Cash Flow read `period_start_date` +
  // `period_end_date` (NOT from_date/to_date). get_period_list then
  // calls get_fiscal_year(period.to_date, company=…) internally, so
  // the dates still need to fall inside a Fiscal Year that exists.
  const [fromFy, toFy] = await Promise.all([
    fiscalYearForDate(opts.fromDate),
    fiscalYearForDate(opts.toDate),
  ]);
  const fy = requireFiscalYear(fromFy ?? toFy, "Profit and Loss");
  return runReport("Profit and Loss Statement", {
    company: opts.company,
    period_start_date: opts.fromDate,
    period_end_date: opts.toDate,
    periodicity: opts.periodicity ?? "Monthly",
    filter_based_on: "Date Range",
    from_fiscal_year: (fromFy ?? toFy)?.name ?? fy.name,
    to_fiscal_year: (toFy ?? fromFy)?.name ?? fy.name,
  });
}

export async function balanceSheet(opts: { company: string; toDate: string; periodicity?: string }) {
  // Balance Sheet is a snapshot "as of" a date, but ERPNext still
  // demands a period range to compute movements. Open the window from
  // the enclosing FY's start.
  const toFy = requireFiscalYear(await fiscalYearForDate(opts.toDate), "Balance Sheet");
  return runReport("Balance Sheet", {
    company: opts.company,
    period_start_date: toFy.year_start_date,
    period_end_date: opts.toDate,
    periodicity: opts.periodicity ?? "Yearly",
    filter_based_on: "Date Range",
    from_fiscal_year: toFy.name,
    to_fiscal_year: toFy.name,
  });
}

export async function cashFlow(opts: PeriodFilter & { periodicity?: string }) {
  const [fromFy, toFy] = await Promise.all([
    fiscalYearForDate(opts.fromDate),
    fiscalYearForDate(opts.toDate),
  ]);
  const fy = requireFiscalYear(fromFy ?? toFy, "Cash Flow");
  return runReport("Cash Flow", {
    company: opts.company,
    period_start_date: opts.fromDate,
    period_end_date: opts.toDate,
    periodicity: opts.periodicity ?? "Monthly",
    filter_based_on: "Date Range",
    from_fiscal_year: (fromFy ?? toFy)?.name ?? fy.name,
    to_fiscal_year: (toFy ?? fromFy)?.name ?? fy.name,
  });
}

export async function accountsReceivable(opts: { company: string; reportDate: string }) {
  return runReport("Accounts Receivable", {
    company: opts.company,
    report_date: opts.reportDate,
    range1: 30,
    range2: 60,
    range3: 90,
    range4: 120,
  });
}

export async function shareLedger(opts: { company: string; shareholder?: string; fromDate?: string; toDate?: string }) {
  return runReport("Share Ledger", {
    company: opts.company,
    shareholder: opts.shareholder,
    from_date: opts.fromDate,
    to_date: opts.toDate,
  });
}

export async function shareBalance(opts: { company: string; asOfDate: string }) {
  return runReport("Share Balance", {
    company: opts.company,
    as_on_date: opts.asOfDate,
  });
}

export async function bankReconciliationStatement(opts: { company: string; account: string; reportDate: string }) {
  return runReport("Bank Reconciliation Statement", {
    company: opts.company,
    account: opts.account,
    report_date: opts.reportDate,
  });
}

export async function budgetVariance(opts: { company: string; fiscalYear: string; period?: string; budgetAgainst?: string }) {
  return runReport("Budget Variance Report", {
    company: opts.company,
    fiscal_year: opts.fiscalYear,
    period: opts.period ?? "Monthly",
    budget_against: opts.budgetAgainst ?? "Cost Center",
    from_fiscal_year: opts.fiscalYear,
    to_fiscal_year: opts.fiscalYear,
    filter_based_on: "Fiscal Year",
  });
}

export async function accountsPayable(opts: { company: string; reportDate: string }) {
  return runReport("Accounts Payable", {
    company: opts.company,
    report_date: opts.reportDate,
    range1: 30,
    range2: 60,
    range3: 90,
    range4: 120,
  });
}
