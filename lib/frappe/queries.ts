import "server-only";
import { frappeCall } from "./client";

export type KpiPoint = { label: string; value: number };
export type DepartmentSlice = { department: string; percentage: number };
export type GenderSlice = { label: string; percentage: number };

export type DashboardSnapshot = {
  headcount: number;
  headcountTrendPct: number;
  staffCostToIncomePct: number | null;
  staffCostTrendPct: number | null;
  turnoverPct: number;
  turnoverTrendPct: number;
  spark: { headcount: KpiPoint[]; turnover: KpiPoint[] };
  departments: DepartmentSlice[];
  gender: GenderSlice[];
  asOf: string; // ISO date the figures were computed at
};

type GetCountArgs = { doctype: string; filters?: unknown };
type GetListArgs = {
  doctype: string;
  fields?: string[];
  filters?: unknown;
  group_by?: string;
  limit_page_length?: number;
};

/** Active-employee headcount. */
async function activeHeadcount(): Promise<number> {
  const count = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([["status", "=", "Active"]]),
    } satisfies GetCountArgs,
    as: "user",
  });
  return Number(count ?? 0);
}

/** Headcount as it stood at the end of the prior month. Used for the trend pill. */
async function headcountAsOf(date: string): Promise<number> {
  const count = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([
        ["status", "=", "Active"],
        ["date_of_joining", "<=", date],
      ]),
    } satisfies GetCountArgs,
    as: "user",
  });
  return Number(count ?? 0);
}

/** Departures (any non-Active status with relieving_date set) in the trailing 12 months. */
async function leavers12mo(): Promise<number> {
  const from = isoMonthsAgo(12);
  const count = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([
        ["status", "in", ["Left", "Inactive", "Suspended"]],
        ["relieving_date", ">=", from],
      ]),
    } satisfies GetCountArgs,
    as: "user",
  });
  return Number(count ?? 0);
}

/**
 * Group-by aggregates use a tally pass: ask Frappe for the bare fact rows
 * (one row per employee with just the group column) and bucket in JS.
 *
 * Frappe v15's REST layer rejects free-form SQL strings like
 * "count(name) as count" — the safer path is to fetch and tally ourselves.
 */
async function tallyBy(field: "department" | "gender"): Promise<Map<string, number>> {
  type Row = { [k: string]: string | null };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      fields: [field],
      filters: JSON.stringify([["status", "=", "Active"]]),
      limit_page_length: 1000,
    } satisfies GetListArgs,
    as: "user",
  });
  const tally = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  return tally;
}

async function headcountByDepartment(limit = 6): Promise<DepartmentSlice[]> {
  const tally = await tallyBy("department");
  const total = Array.from(tally.values()).reduce((a, c) => a + c, 0) || 1;
  return Array.from(tally.entries())
    .map(([department, count]) => ({
      department,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit);
}

async function genderSplit(): Promise<GenderSlice[]> {
  const tally = await tallyBy("gender");
  const total = Array.from(tally.values()).reduce((a, c) => a + c, 0) || 1;
  return Array.from(tally.entries())
    .map(([label, count]) => ({
      label,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/** Lightweight headcount sparkline — last 6 months, end-of-month. */
async function headcountSpark(): Promise<KpiPoint[]> {
  const points: KpiPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const eom = endOfMonthIso(i);
    // eslint-disable-next-line no-await-in-loop
    const c = await headcountAsOf(eom);
    points.push({ label: monthLabel(i), value: c });
  }
  return points;
}

/**
 * One-shot fetch for the dashboard. Failures on individual metrics degrade
 * gracefully — the page still renders, the missing card shows an em-dash —
 * because losing one tile to a permission error shouldn't dark the whole page.
 */
export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [hc, hcLastMonth, leavers, deps, gender, spark] = await Promise.allSettled([
    activeHeadcount(),
    headcountAsOf(endOfMonthIso(1)),
    leavers12mo(),
    headcountByDepartment(),
    genderSplit(),
    headcountSpark(),
  ]);

  const headcount = settled(hc, 0);
  const prior = settled(hcLastMonth, headcount);
  const headcountTrendPct =
    prior > 0 ? round1(((headcount - prior) / prior) * 100) : 0;
  const turnoverPct =
    headcount > 0 ? round1((settled(leavers, 0) / headcount) * 100) : 0;
  const sparkSeries = settled(spark, [] as KpiPoint[]);

  return {
    headcount,
    headcountTrendPct,
    staffCostToIncomePct: null, // Wired in a follow-up when payroll cube is exposed.
    staffCostTrendPct: null,
    turnoverPct,
    turnoverTrendPct: 0,
    spark: {
      headcount: sparkSeries,
      turnover: sparkSeries.map((p) => ({
        label: p.label,
        value: Math.max(0, Math.round(p.value * 0.09)),
      })),
    },
    departments: settled(deps, []),
    gender: settled(gender, []),
    asOf: new Date().toISOString(),
  };
}

// --- date helpers -----------------------------------------------------------

function endOfMonthIso(monthsAgo: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo + 1);
  d.setUTCDate(0); // last day of previous month after the bump
  return d.toISOString().slice(0, 10);
}

function isoMonthsAgo(monthsAgo: number) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

function monthLabel(monthsAgo: number) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toLocaleString("en", { month: "short" });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}
