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

/**
 * The attributed movement headline — the brief's "why, not just what".
 * Computed from the records, never guessed: when two months of salary
 * slips exist the payroll cost movement is attributed to joiners /
 * leavers / changes for existing staff; otherwise the story is the
 * team's own movement this month, by department.
 */
export type Movement = {
  headline: string;
  parts: { label: string; detail: string }[];
  /** Where the figures come from — rendered as the provenance line. */
  basis: string;
};

export type NeedsYouItem = {
  label: string;
  count: number;
  href: string;
};

export type ExecSnapshot = {
  hr: DashboardSnapshot | null;
  payroll: PayrollSummary | null;
  accounting: AccountingSummary | null;
  recruitment: RecruitmentSummary | null;
  movement: Movement | null;
  needsYou: NeedsYouItem[];
  asOf: string;
};

export type ExecAccess = {
  hr: boolean;
  payroll: boolean;
  accounting: boolean;
  recruitment: boolean;
};

export async function fetchExecSnapshot(access: ExecAccess): Promise<ExecSnapshot> {
  const [hr, payroll, accounting, recruitment, movement, needsYou] =
    await Promise.allSettled([
      access.hr          ? fetchDashboardSnapshot() : Promise.resolve(null),
      access.payroll     ? loadPayrollSummary()     : Promise.resolve(null),
      access.accounting  ? loadAccountingSummary()  : Promise.resolve(null),
      access.recruitment ? loadRecruitmentSummary() : Promise.resolve(null),
      access.hr || access.payroll ? loadMovement(access) : Promise.resolve(null),
      loadNeedsYou(access),
    ]);

  return {
    hr: settled(hr),
    payroll: settled(payroll),
    accounting: settled(accounting),
    recruitment: settled(recruitment),
    movement: settled(movement),
    needsYou: settled(needsYou) ?? [],
    asOf: new Date().toISOString(),
  };
}

// ─── Attributed movement ──────────────────────────────────────────────

/** "Production - CHD" → "Production" for prose. */
function deptLabel(v: string | null | undefined): string {
  if (!v) return "Unassigned";
  return v.replace(/\s+-\s+[A-Z]{2,6}$/, "");
}

function monthName(offset: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toLocaleString("en-GB", { month: "long" });
}

function monthBounds(offset: number): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function loadMovement(access: ExecAccess): Promise<Movement | null> {
  if (access.payroll) {
    const m = await payrollMovement().catch(() => null);
    if (m) return m;
  }
  if (access.hr) {
    // This month first; if the month is young and quiet, last month's
    // movement is still the freshest true story.
    const now = await peopleMovement(0).catch(() => null);
    if (now) return now;
    return peopleMovement(-1).catch(() => null);
  }
  return null;
}

/** Payroll-cost attribution: this month vs last, split into joiners,
 *  leavers and changes for the people on both runs. */
async function payrollMovement(): Promise<Movement | null> {
  type Slip = { employee: string; gross_pay?: number };
  const fetchMonth = (offset: number) => {
    const { start, end } = monthBounds(offset);
    return frappeCall<Slip[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Salary Slip",
        fields: ["employee", "gross_pay"],
        filters: JSON.stringify([
          ["docstatus", "=", 1],
          ["start_date", ">=", start],
          ["start_date", "<=", end],
        ]),
        limit_page_length: 0,
      },
      as: "user",
    });
  };
  const [cur, prev] = await Promise.all([fetchMonth(0), fetchMonth(-1)]);
  if (cur.length === 0 || prev.length === 0) return null;

  const sum = (rows: Slip[]) => rows.reduce((a, s) => a + Number(s.gross_pay ?? 0), 0);
  const curTotal = sum(cur);
  const prevTotal = sum(prev);
  if (prevTotal <= 0) return null;

  const curBy = new Map(cur.map((s) => [s.employee, Number(s.gross_pay ?? 0)]));
  const prevBy = new Map(prev.map((s) => [s.employee, Number(s.gross_pay ?? 0)]));
  let joiners = 0, joinerCount = 0, leavers = 0, leaverCount = 0, existing = 0;
  for (const [emp, g] of curBy) {
    if (prevBy.has(emp)) existing += g - (prevBy.get(emp) ?? 0);
    else { joiners += g; joinerCount += 1; }
  }
  for (const [emp, g] of prevBy) {
    if (!curBy.has(emp)) { leavers += g; leaverCount += 1; }
  }

  const delta = curTotal - prevTotal;
  const pct = Math.round((delta / prevTotal) * 1000) / 10;
  const money = (n: number) =>
    `US$${Math.abs(Math.round(n)).toLocaleString("en-GB")}`;
  const parts: Movement["parts"] = [];
  if (joinerCount > 0)
    parts.push({ label: `+${money(joiners)}`, detail: `${joinerCount} new joiner${joinerCount === 1 ? "" : "s"}` });
  if (leaverCount > 0)
    parts.push({ label: `−${money(leavers)}`, detail: `${leaverCount} leaver${leaverCount === 1 ? "" : "s"}` });
  if (Math.round(existing) !== 0)
    parts.push({
      label: `${existing >= 0 ? "+" : "−"}${money(existing)}`,
      detail: "changes for existing staff",
    });

  return {
    headline:
      `Payroll cost ${delta >= 0 ? "rose" : "fell"} ${Math.abs(pct)}% on ` +
      `${monthName(-1)} — ${money(curTotal)} this month.`,
    parts,
    basis: `From ${cur.length} salary slips this month and ${prev.length} last month.`,
  };
}

/** Team movement this month, by department — the story when payroll
 *  history is still thin. */
async function peopleMovement(offset: number): Promise<Movement | null> {
  type Row = { department?: string | null };
  const { start, end } = monthBounds(offset);
  const [joined, left] = await Promise.all([
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["department"],
        filters: JSON.stringify([
          ["date_of_joining", ">=", start],
          ["date_of_joining", "<=", end],
        ]),
        limit_page_length: 0,
      },
      as: "user",
    }).catch(() => [] as Row[]),
    frappeCall<Row[]>({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee",
        fields: ["department"],
        filters: JSON.stringify([
          ["status", "in", ["Left", "Inactive", "Suspended"]],
          ["relieving_date", ">=", start],
          ["relieving_date", "<=", end],
        ]),
        limit_page_length: 0,
      },
      as: "user",
    }).catch(() => [] as Row[]),
  ]);

  if (joined.length === 0 && left.length === 0) return null;

  const tally = new Map<string, number>();
  for (const r of joined) {
    const d = deptLabel(r.department);
    tally.set(d, (tally.get(d) ?? 0) + 1);
  }
  const top = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const net = joined.length - left.length;

  const parts: Movement["parts"] = top.map(([d, n]) => ({
    label: `+${n}`,
    detail: d,
  }));
  if (left.length > 0)
    parts.push({ label: `−${left.length}`, detail: "left the business" });

  const grewOrShrank =
    net > 0 ? `grew by ${net}` : net < 0 ? `shrank by ${Math.abs(net)}` : "held steady";
  return {
    headline: `Your team ${grewOrShrank} in ${monthName(offset)} — ${joined.length} joined, ${left.length} left.`,
    parts,
    basis: `From employee joining and leaving dates in ${monthName(offset)}.`,
  };
}

// ─── Needs you today ──────────────────────────────────────────────────

async function loadNeedsYou(access: ExecAccess): Promise<NeedsYouItem[]> {
  const count = (doctype: string, filters: unknown) =>
    frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters: JSON.stringify(filters) },
      as: "user",
    }).catch(() => 0);

  const jobs: Array<Promise<NeedsYouItem | null>> = [];
  if (access.hr) {
    jobs.push(
      count("Leave Application", [["status", "=", "Open"]]).then((n) => ({
        label: "leave requests waiting",
        count: Number(n ?? 0),
        href: "/hr/leaves",
      })),
      count("Expense Claim", [
        ["docstatus", "=", 0],
        ["approval_status", "=", "Draft"],
      ]).then((n) => ({
        label: "expense claims to review",
        count: Number(n ?? 0),
        href: "/hr/expense-claims",
      })),
    );
  }
  if (access.accounting) {
    jobs.push(
      count("Sales Invoice", [["docstatus", "=", 0]]).then((n) => ({
        label: "draft invoices to post",
        count: Number(n ?? 0),
        href: "/accounting/sales-invoices?docstatus=0",
      })),
      count("Purchase Invoice", [["docstatus", "=", 0]]).then((n) => ({
        label: "draft bills to post",
        count: Number(n ?? 0),
        href: "/accounting/purchase-invoices?docstatus=0",
      })),
    );
  }
  if (access.payroll) {
    jobs.push(
      count("Payroll Run", [["status", "=", "OPEN"]]).then((n) => ({
        label: "open pay runs",
        count: Number(n ?? 0),
        href: "/payroll",
      })),
    );
  }

  const settledItems = await Promise.allSettled(jobs);
  return settledItems
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((i): i is NeedsYouItem => !!i && i.count > 0);
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
