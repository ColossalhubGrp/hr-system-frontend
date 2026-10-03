import "server-only";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

/**
 * Live-data loader for the Accounting Overview dashboard. Issues one
 * query per concern + runs everything in parallel. Every list query
 * is capped so a large tenant doesn't DOS our own render — totals
 * come out slightly low on edge cases but it's a dashboard, not a
 * month-end close report.
 */

export type OverviewData = {
  company: string | null;
  kpis: {
    arOutstanding: number;
    apOutstanding: number;
    revenueMtd: number;
    expensesMtd: number;
    netMtd: number;
    overdueCount: number;
  };
  monthly: Array<{ monthLabel: string; revenue: number; expenses: number }>;
  alerts: {
    overdueInvoices: number;
    overdueAmount: number;
    draftInvoices: number;
    draftBills: number;
    openPaymentEntries: number;
  };
  recent: Array<{
    kind: "Sales Invoice" | "Purchase Invoice" | "Journal Entry" | "Payment Entry";
    name: string;
    at: string;              // ISO
    party: string | null;
    amount: number;
    currency: string | null;
  }>;
};

type SI = {
  name: string;
  customer: string | null;
  posting_date: string | null;
  grand_total: number | null;
  outstanding_amount: number | null;
  due_date: string | null;
  status: string | null;
  currency: string | null;
  creation: string;
};

type PI = {
  name: string;
  supplier: string | null;
  posting_date: string | null;
  grand_total: number | null;
  outstanding_amount: number | null;
  due_date: string | null;
  status: string | null;
  currency: string | null;
  creation: string;
};

type JE = {
  name: string;
  posting_date: string | null;
  total_debit: number | null;
  voucher_type: string | null;
  currency: string | null;
  creation: string;
};

type PE = {
  name: string;
  posting_date: string | null;
  party: string | null;
  paid_amount: number | null;
  payment_type: string | null;
  paid_from_account_currency: string | null;
  creation: string;
};

async function safeList<T>(args: Record<string, unknown>): Promise<T[]> {
  try {
    return await frappeCall<T[]>({
      method: "frappe.client.get_list",
      args,
      as: "user",
    });
  } catch {
    return [] as T[];
  }
}

function monthKey(iso: string | null): string {
  return (iso ?? "").slice(0, 7); // YYYY-MM
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function last12MonthKeys(todayIso: string): string[] {
  const [y, m] = todayIso.slice(0, 7).split("-").map(Number);
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    let yy = y;
    let mm = m - i;
    while (mm <= 0) { mm += 12; yy -= 1; }
    keys.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return keys;
}

function labelFor(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_LABELS[(m || 1) - 1]} ${String(y).slice(2)}`;
}

export async function loadOverviewData(): Promise<OverviewData> {
  const company = await myCompany();
  const today = new Date().toISOString().slice(0, 10);
  const twelveMonthsAgo = (() => {
    const [y, m] = today.slice(0, 7).split("-").map(Number);
    let yy = y, mm = m - 11;
    while (mm <= 0) { mm += 12; yy -= 1; }
    return `${yy}-${String(mm).padStart(2, "0")}-01`;
  })();
  const mtdFrom = `${today.slice(0, 7)}-01`;

  const companyFilter = company ? ["company", "=", company] as const : null;

  const [si12m, pi12m, overdueSi, draftSi, draftPi, recentJE, recentPE, openPEDrafts] = await Promise.all([
    safeList<SI>({
      doctype: "Sales Invoice",
      fields: [
        "name", "customer", "posting_date", "grand_total",
        "outstanding_amount", "due_date", "status", "currency", "creation",
      ],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 1],
        ["posting_date", ">=", twelveMonthsAgo],
      ]),
      order_by: "posting_date desc",
      limit_page_length: 1000,
    }),
    safeList<PI>({
      doctype: "Purchase Invoice",
      fields: [
        "name", "supplier", "posting_date", "grand_total",
        "outstanding_amount", "due_date", "status", "currency", "creation",
      ],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 1],
        ["posting_date", ">=", twelveMonthsAgo],
      ]),
      order_by: "posting_date desc",
      limit_page_length: 1000,
    }),
    safeList<SI>({
      doctype: "Sales Invoice",
      fields: ["name", "outstanding_amount"],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 1],
        ["status", "=", "Overdue"],
      ]),
      limit_page_length: 500,
    }),
    safeList<{ name: string }>({
      doctype: "Sales Invoice",
      fields: ["name"],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 0],
      ]),
      limit_page_length: 500,
    }),
    safeList<{ name: string }>({
      doctype: "Purchase Invoice",
      fields: ["name"],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 0],
      ]),
      limit_page_length: 500,
    }),
    safeList<JE>({
      doctype: "Journal Entry",
      fields: ["name", "posting_date", "total_debit", "voucher_type", "creation"],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 1],
      ]),
      order_by: "creation desc",
      limit_page_length: 10,
    }),
    safeList<PE>({
      doctype: "Payment Entry",
      fields: [
        "name", "posting_date", "party", "paid_amount",
        "payment_type", "paid_from_account_currency", "creation",
      ],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 1],
      ]),
      order_by: "creation desc",
      limit_page_length: 10,
    }),
    safeList<{ name: string }>({
      doctype: "Payment Entry",
      fields: ["name"],
      filters: JSON.stringify([
        ...(companyFilter ? [companyFilter] : []),
        ["docstatus", "=", 0],
      ]),
      limit_page_length: 500,
    }),
  ]);

  // KPI roll-ups
  const arOutstanding = si12m.reduce((a, s) => a + Number(s.outstanding_amount ?? 0), 0);
  const apOutstanding = pi12m.reduce((a, p) => a + Number(p.outstanding_amount ?? 0), 0);
  const revenueMtd = si12m
    .filter((s) => (s.posting_date ?? "") >= mtdFrom)
    .reduce((a, s) => a + Number(s.grand_total ?? 0), 0);
  const expensesMtd = pi12m
    .filter((p) => (p.posting_date ?? "") >= mtdFrom)
    .reduce((a, p) => a + Number(p.grand_total ?? 0), 0);
  const netMtd = revenueMtd - expensesMtd;
  const overdueAmount = overdueSi.reduce((a, s) => a + Number(s.outstanding_amount ?? 0), 0);

  // Monthly P&L buckets
  const keys = last12MonthKeys(today);
  const bucket = new Map<string, { revenue: number; expenses: number }>();
  for (const k of keys) bucket.set(k, { revenue: 0, expenses: 0 });
  for (const s of si12m) {
    const b = bucket.get(monthKey(s.posting_date));
    if (b) b.revenue += Number(s.grand_total ?? 0);
  }
  for (const p of pi12m) {
    const b = bucket.get(monthKey(p.posting_date));
    if (b) b.expenses += Number(p.grand_total ?? 0);
  }
  const monthly = keys.map((k) => ({
    monthLabel: labelFor(k),
    revenue: bucket.get(k)?.revenue ?? 0,
    expenses: bucket.get(k)?.expenses ?? 0,
  }));

  // Recent activity — merge sources, sort by creation desc.
  type R = OverviewData["recent"][number];
  const recent: R[] = [];
  for (const s of si12m.slice(0, 10)) recent.push({
    kind: "Sales Invoice", name: s.name, at: s.creation,
    party: s.customer, amount: Number(s.grand_total ?? 0),
    currency: s.currency,
  });
  for (const p of pi12m.slice(0, 10)) recent.push({
    kind: "Purchase Invoice", name: p.name, at: p.creation,
    party: p.supplier, amount: Number(p.grand_total ?? 0),
    currency: p.currency,
  });
  for (const j of recentJE) recent.push({
    kind: "Journal Entry", name: j.name, at: j.creation,
    party: j.voucher_type, amount: Number(j.total_debit ?? 0),
    currency: j.currency ?? null,
  });
  for (const pe of recentPE) recent.push({
    kind: "Payment Entry", name: pe.name, at: pe.creation,
    party: pe.party, amount: Number(pe.paid_amount ?? 0),
    currency: pe.paid_from_account_currency ?? null,
  });
  recent.sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  return {
    company,
    kpis: {
      arOutstanding,
      apOutstanding,
      revenueMtd,
      expensesMtd,
      netMtd,
      overdueCount: overdueSi.length,
    },
    monthly,
    alerts: {
      overdueInvoices: overdueSi.length,
      overdueAmount,
      draftInvoices: draftSi.length,
      draftBills: draftPi.length,
      openPaymentEntries: openPEDrafts.length,
    },
    recent: recent.slice(0, 10),
  };
}
