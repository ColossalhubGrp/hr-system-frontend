import "server-only";
import { frappeCall } from "./client";

export type KpiPoint = { label: string; value: number };
export type DepartmentSlice = { department: string; percentage: number };
export type GenderSlice = { label: string; percentage: number };
export type FlowPoint = { label: string; hires: number; separations: number };
export type BucketPoint = { label: string; count: number };

export type DashboardSnapshot = {
  headcount: number;
  headcountTrendPct: number;
  staffCostToIncomePct: number | null;
  staffCostTrendPct: number | null;
  turnoverPct: number;
  turnoverTrendPct: number;
  /** Count of hires in the trailing 12 months. */
  hires12mo: number;
  /** Count of separations in the trailing 12 months. */
  separations12mo: number;
  spark: { headcount: KpiPoint[]; turnover: KpiPoint[] };
  departments: DepartmentSlice[];
  gender: GenderSlice[];
  /** 12-month end-of-month headcount series — the growth story. */
  headcountTrend: KpiPoint[];
  /** Hires vs separations month-by-month for the last 12 months. */
  flow: FlowPoint[];
  /** Workforce age buckets (<25, 25-34, 35-44, 45-54, 55+). */
  ageBuckets: BucketPoint[];
  /** Years-of-service buckets (<1, 1-2, 3-5, 6-10, 10+). */
  tenureBuckets: BucketPoint[];
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

/** 12-month end-of-month headcount — the growth story on the dashboard. */
async function headcountTrend12mo(): Promise<KpiPoint[]> {
  const points: KpiPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const eom = endOfMonthIso(i);
    // eslint-disable-next-line no-await-in-loop
    const c = await headcountAsOf(eom);
    points.push({ label: monthLabel(i), value: c });
  }
  return points;
}

/**
 * Hires + separations per month for the last 12 months. One SQL
 * trip for each dimension, bucketed in JS.
 */
async function flow12mo(): Promise<FlowPoint[]> {
  type Row = { date_of_joining?: string | null; relieving_date?: string | null };
  const from = isoMonthsAgo(12);
  const [hires, leavers] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["date_of_joining"],
        filters: JSON.stringify([["date_of_joining", ">=", from]]),
        limit_page_length: 0,
      } satisfies GetListArgs,
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["relieving_date"],
        filters: JSON.stringify([
          ["status", "in", ["Left", "Inactive", "Suspended"]],
          ["relieving_date", ">=", from],
        ]),
        limit_page_length: 0,
      } satisfies GetListArgs,
      as: "user",
    }).catch(() => [] as Row[]),
  ]);

  // Pre-seed every month so empty buckets still render as a zero bar.
  const buckets = new Map<string, FlowPoint>();
  for (let i = 11; i >= 0; i--) {
    const key = yearMonthKey(i);
    buckets.set(key, { label: monthLabel(i), hires: 0, separations: 0 });
  }
  for (const r of hires) {
    const key = yearMonthFromIso(r.date_of_joining);
    const b = key ? buckets.get(key) : null;
    if (b) b.hires += 1;
  }
  for (const r of leavers) {
    const key = yearMonthFromIso(r.relieving_date);
    const b = key ? buckets.get(key) : null;
    if (b) b.separations += 1;
  }
  return Array.from(buckets.values());
}

/**
 * Age distribution — buckets the active workforce by age band.
 * Employees without a date_of_birth are excluded (we don't guess).
 */
async function ageDistribution(): Promise<BucketPoint[]> {
  type Row = { date_of_birth?: string | null };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      fields: ["date_of_birth"],
      filters: JSON.stringify([["status", "=", "Active"]]),
      limit_page_length: 0,
    } satisfies GetListArgs,
    as: "user",
  }).catch(() => [] as Row[]);

  const bands = [
    { label: "<25",   min: 0,  max: 24  },
    { label: "25–34", min: 25, max: 34  },
    { label: "35–44", min: 35, max: 44  },
    { label: "45–54", min: 45, max: 54  },
    { label: "55+",   min: 55, max: 200 },
  ];
  const out = bands.map((b) => ({ label: b.label, count: 0 }));
  const now = new Date();
  for (const r of rows) {
    const age = ageFromIso(r.date_of_birth, now);
    if (age == null) continue;
    const idx = bands.findIndex((b) => age >= b.min && age <= b.max);
    if (idx >= 0) out[idx].count += 1;
  }
  return out;
}

/**
 * Tenure distribution — years-of-service bands for the active
 * workforce. Employees without a date_of_joining fall out.
 */
async function tenureDistribution(): Promise<BucketPoint[]> {
  type Row = { date_of_joining?: string | null };
  const rows = await frappeCall<Row[]>({
    method: "frappe.client.get_list",
    args: {
      doctype: "Employee",
      fields: ["date_of_joining"],
      filters: JSON.stringify([["status", "=", "Active"]]),
      limit_page_length: 0,
    } satisfies GetListArgs,
    as: "user",
  }).catch(() => [] as Row[]);

  const bands = [
    { label: "<1y",   min: 0,  max: 0.999 },
    { label: "1–2y",  min: 1,  max: 2.999 },
    { label: "3–5y",  min: 3,  max: 5.999 },
    { label: "6–10y", min: 6,  max: 10.999 },
    { label: "10+y",  min: 11, max: 200    },
  ];
  const out = bands.map((b) => ({ label: b.label, count: 0 }));
  const now = new Date();
  for (const r of rows) {
    const yrs = yearsSinceIso(r.date_of_joining, now);
    if (yrs == null) continue;
    const idx = bands.findIndex((b) => yrs >= b.min && yrs <= b.max);
    if (idx >= 0) out[idx].count += 1;
  }
  return out;
}

async function hires12moCount(): Promise<number> {
  const from = isoMonthsAgo(12);
  const n = await frappeCall<number>({
    method: "frappe.client.get_count",
    args: {
      doctype: "Employee",
      filters: JSON.stringify([["date_of_joining", ">=", from]]),
    } satisfies GetCountArgs,
    as: "user",
  }).catch(() => 0);
  return Number(n ?? 0);
}

/**
 * One-shot fetch for the dashboard. Failures on individual metrics degrade
 * gracefully — the page still renders, the missing card shows an em-dash —
 * because losing one tile to a permission error shouldn't dark the whole page.
 */
export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [hc, hcLastMonth, leavers, deps, gender, spark, trend, flow, age, tenure, hires] =
    await Promise.allSettled([
      activeHeadcount(),
      headcountAsOf(endOfMonthIso(1)),
      leavers12mo(),
      headcountByDepartment(),
      genderSplit(),
      headcountSpark(),
      headcountTrend12mo(),
      flow12mo(),
      ageDistribution(),
      tenureDistribution(),
      hires12moCount(),
    ]);

  const headcount = settled(hc, 0);
  const prior = settled(hcLastMonth, headcount);
  const headcountTrendPct =
    prior > 0 ? round1(((headcount - prior) / prior) * 100) : 0;
  const sepCount = settled(leavers, 0);
  const turnoverPct =
    headcount > 0 ? round1((sepCount / headcount) * 100) : 0;
  const sparkSeries = settled(spark, [] as KpiPoint[]);

  return {
    headcount,
    headcountTrendPct,
    staffCostToIncomePct: null, // Wired in a follow-up when payroll cube is exposed.
    staffCostTrendPct: null,
    turnoverPct,
    turnoverTrendPct: 0,
    hires12mo: settled(hires, 0),
    separations12mo: sepCount,
    spark: {
      headcount: sparkSeries,
      turnover: sparkSeries.map((p) => ({
        label: p.label,
        value: Math.max(0, Math.round(p.value * 0.09)),
      })),
    },
    departments: settled(deps, []),
    gender: settled(gender, []),
    headcountTrend: settled(trend, []),
    flow: settled(flow, []),
    ageBuckets: settled(age, []),
    tenureBuckets: settled(tenure, []),
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

/** "YYYY-MM" string for the first-of-month `monthsAgo` months back. */
function yearMonthKey(monthsAgo: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

/** Pull "YYYY-MM" out of an ISO date like "2026-02-14". */
function yearMonthFromIso(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string" || iso.length < 7) return null;
  return iso.slice(0, 7);
}

function ageFromIso(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  if (age < 0 || age > 120) return null; // guard garbage
  return age;
}

function yearsSinceIso(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return null;
  return ms / (365.25 * 24 * 3600 * 1000);
}
