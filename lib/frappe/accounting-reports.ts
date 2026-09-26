import "server-only";
import { frappeCall } from "./client";

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

export async function trialBalance(opts: PeriodFilter) {
  return runReport("Trial Balance", {
    company: opts.company,
    from_date: opts.fromDate,
    to_date: opts.toDate,
    fiscal_year: undefined,
    show_zero_values: 0,
    show_unclosed_fy_pl_balances: 1,
  });
}

export async function profitAndLoss(opts: PeriodFilter & { periodicity?: string }) {
  return runReport("Profit and Loss Statement", {
    company: opts.company,
    from_date: opts.fromDate,
    to_date: opts.toDate,
    periodicity: opts.periodicity ?? "Monthly",
    filter_based_on: "Date Range",
  });
}

export async function balanceSheet(opts: { company: string; toDate: string; periodicity?: string }) {
  return runReport("Balance Sheet", {
    company: opts.company,
    to_date: opts.toDate,
    periodicity: opts.periodicity ?? "Yearly",
    filter_based_on: "Date Range",
    from_date: opts.toDate,
  });
}

export async function cashFlow(opts: PeriodFilter & { periodicity?: string }) {
  return runReport("Cash Flow", {
    company: opts.company,
    from_date: opts.fromDate,
    to_date: opts.toDate,
    periodicity: opts.periodicity ?? "Monthly",
    filter_based_on: "Date Range",
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
