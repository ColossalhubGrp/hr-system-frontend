import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";
import { listPayRuns, type PayRunRow } from "./payruns";

export interface DashboardMetrics {
  currency: "USD";
  /** Latest processed/updated run's summed totals + count of payslips. */
  latest: {
    run: PayRunRow | null;
    grossUsd: number;
    grossZig: number;
    netUsd: number;
    netZig: number;
    payeUsd: number;
    aidsUsd: number;
    nssaEmployee: number;
    nssaEmployer: number;
    pensionUsd: number;
    zimdef: number;
    taxCreditsUsd: number;
    employeeCount: number;
    /** Slice per department for the horizontal bar. */
    byDepartment: Array<{ label: string; netUsd: number }>;
  };
  /** Monthly aggregate for the trend chart. Newest last. */
  trend: Array<{
    label: string;           // e.g. "Jun 2026"
    grossUsd: number;
    netUsd: number;
    payeUsd: number;
    isForecast: boolean;     // months with no processed run
  }>;
  /** Year-to-date totals across every processed run in the current
   *  calendar year. */
  ytd: {
    grossUsd: number;
    netUsd: number;
    payeUsd: number;
    employerCostUsd: number; // net + NSSA_er + ZIMDEF
    runs: number;
  };
  /** How many employees are excluded from the next run for missing
   *  critical info. Small integer; matches the Action Required banner. */
  blockedEmployeeCount: number;
  /** For the recent-runs strip on the dashboard. Newest first, cap 5. */
  recent: PayRunRow[];
}

interface PayslipSum {
  employee: string | null;
  gross_usd: number | null;
  gross_zig: number | null;
  net_usd: number | null;
  net_zig: number | null;
  paye_usd: number | null;
  aids_usd: number | null;
  nssa_employee: number | null;
  nssa_employer: number | null;
  pension_usd: number | null;
  zimdef: number | null;
  tax_credits_usd: number | null;
}

async function fetchSlipsForRuns(runNames: string[]): Promise<Map<string, PayslipSum[]>> {
  if (runNames.length === 0) return new Map();
  const res = await frappeCall<PayslipSum[] & { payroll_run: string }[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Payroll Run Payslip",
      fields: [
        "employee", "payroll_run",
        "gross_usd", "gross_zig",
        "net_usd", "net_zig",
        "paye_usd", "aids_usd",
        "nssa_employee", "nssa_employer",
        "pension_usd", "zimdef",
        "tax_credits_usd",
      ],
      filters: JSON.stringify([["payroll_run", "in", runNames]]),
      limit_page_length: 5000,
    },
    as: "user",
  });
  const rows = (res as unknown as Array<PayslipSum & { payroll_run: string }>) ?? [];
  const byRun = new Map<string, PayslipSum[]>();
  for (const r of rows) {
    if (!byRun.has(r.payroll_run)) byRun.set(r.payroll_run, []);
    byRun.get(r.payroll_run)!.push(r);
  }
  return byRun;
}

async function fetchDeptByEmployee(): Promise<Map<string, string>> {
  const company = await myCompany();
  if (!company) return new Map();
  try {
    const rows = await frappeCall<Array<{ name: string; department: string | null }>>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["name", "department"],
        filters: JSON.stringify([["company", "=", company]]),
        limit_page_length: 5000,
      },
      as: "user",
    });
    const out = new Map<string, string>();
    for (const r of rows ?? []) out.set(r.name, r.department || "Unassigned");
    return out;
  } catch {
    return new Map();
  }
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(iso: string): string {
  if (!iso) return "";
  const [y, m] = iso.slice(0, 10).split("-");
  return `${y}-${m}`;
}

function lastNMonthKeys(n: number, endIso: string): string[] {
  // "2026-07" style keys, oldest first.
  const [ys, ms] = endIso.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let y = ys;
    let m = ms - i;
    while (m <= 0) { m += 12; y -= 1; }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

function keyToLabel(k: string): string {
  const [y, m] = k.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

export async function getDashboardMetrics(months = 6): Promise<DashboardMetrics> {
  const runs = await listPayRuns();
  // Only processed/updated runs actually produced slips.
  const paid = runs.filter((r) => r.status === "PROCESSED" || r.status === "UPDATED");

  const today = new Date().toISOString().slice(0, 10);
  const trendKeys = lastNMonthKeys(months, today);
  const runsInTrend = paid.filter((r) => {
    if (!r.pay_date) return false;
    return trendKeys.includes(monthKey(r.pay_date));
  });

  const latestRun = paid[0] ?? null;
  const latestRunSlipMap = latestRun ? await fetchSlipsForRuns([latestRun.name]) : new Map();
  const latestSlips = latestRun ? latestRunSlipMap.get(latestRun.name) ?? [] : [];

  const deptByEmp = await fetchDeptByEmployee();

  // Latest run totals + per-department breakdown
  const latest = {
    run: latestRun,
    grossUsd: 0,
    grossZig: 0,
    netUsd: 0,
    netZig: 0,
    payeUsd: 0,
    aidsUsd: 0,
    nssaEmployee: 0,
    nssaEmployer: 0,
    pensionUsd: 0,
    zimdef: 0,
    taxCreditsUsd: 0,
    employeeCount: latestSlips.length,
    byDepartment: [] as Array<{ label: string; netUsd: number }>,
  };
  const deptTotals = new Map<string, number>();
  for (const s of latestSlips) {
    latest.grossUsd += Number(s.gross_usd ?? 0);
    latest.grossZig += Number(s.gross_zig ?? 0);
    latest.netUsd += Number(s.net_usd ?? 0);
    latest.netZig += Number(s.net_zig ?? 0);
    latest.payeUsd += Number(s.paye_usd ?? 0);
    latest.aidsUsd += Number(s.aids_usd ?? 0);
    latest.nssaEmployee += Number(s.nssa_employee ?? 0);
    latest.nssaEmployer += Number(s.nssa_employer ?? 0);
    latest.pensionUsd += Number(s.pension_usd ?? 0);
    latest.zimdef += Number(s.zimdef ?? 0);
    latest.taxCreditsUsd += Number(s.tax_credits_usd ?? 0);
    const dept = deptByEmp.get(s.employee ?? "") ?? "Unassigned";
    deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + Number(s.net_usd ?? 0));
  }
  latest.byDepartment = Array.from(deptTotals.entries())
    .map(([label, netUsd]) => ({ label, netUsd }))
    .sort((a, b) => b.netUsd - a.netUsd)
    .slice(0, 6);

  // Trend — one point per month, forecast=true when no data.
  const trendSlipMap = await fetchSlipsForRuns(runsInTrend.map((r) => r.name));
  const trend = trendKeys.map((k) => {
    const runsThisMonth = runsInTrend.filter((r) => monthKey(r.pay_date) === k);
    let grossUsd = 0, netUsd = 0, payeUsd = 0;
    for (const r of runsThisMonth) {
      for (const s of trendSlipMap.get(r.name) ?? []) {
        grossUsd += Number(s.gross_usd ?? 0);
        netUsd += Number(s.net_usd ?? 0);
        payeUsd += Number(s.paye_usd ?? 0);
      }
    }
    return {
      label: keyToLabel(k),
      grossUsd,
      netUsd,
      payeUsd,
      isForecast: runsThisMonth.length === 0,
    };
  });

  // YTD across every processed run in the current year
  const year = today.slice(0, 4);
  const ytdRuns = paid.filter((r) => (r.pay_date || "").startsWith(year));
  const ytdSlipMap = await fetchSlipsForRuns(ytdRuns.map((r) => r.name));
  const ytd = { grossUsd: 0, netUsd: 0, payeUsd: 0, employerCostUsd: 0, runs: ytdRuns.length };
  for (const r of ytdRuns) {
    for (const s of ytdSlipMap.get(r.name) ?? []) {
      const gross = Number(s.gross_usd ?? 0);
      const net = Number(s.net_usd ?? 0);
      const paye = Number(s.paye_usd ?? 0);
      const nssaEr = Number(s.nssa_employer ?? 0);
      const zimdef = Number(s.zimdef ?? 0);
      ytd.grossUsd += gross;
      ytd.netUsd += net;
      ytd.payeUsd += paye;
      ytd.employerCostUsd += gross + nssaEr + zimdef;
    }
  }

  return {
    currency: "USD",
    latest,
    trend,
    ytd,
    blockedEmployeeCount: 0,   // filled by caller (banner already runs its own query)
    recent: paid.slice(0, 5),
  };
}
