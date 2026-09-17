"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import type { PayRunRow } from "@/lib/payroll-engine/payruns";

/**
 * Rippling-shape pay-runs list with:
 *   Tabs      Upcoming / Paid / Archived / Failed
 *   Filters   run-type dropdown + pay-date range
 *   Search    period-label / pay-run id substring
 *   Table     Pay run · Pay date · Rate · Employees · Net (USD) · Status · Action
 *
 * Each tab is a pre-filter over the same source list:
 *   Upcoming = OPEN | PROCESSED (still active)
 *   Paid     = UPDATED  (closed, employees paid), less than 90 days old
 *   Archived = UPDATED  older than 90 days
 *   Failed   = empty for now — we don't yet track processing failure
 *              on the Payroll Run doctype; the tab is here for shape
 *              parity so HR can find it when we add that state.
 */
type Tab = "Upcoming" | "Paid" | "Archived" | "Failed";
type TypeFilter = "ALL" | "REGULAR" | "BONUS" | "COMMISSION" | "TERMINAL";

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** Days between an ISO date and today. Negative = in the past. */
function daysAgo(iso: string): number {
  if (!iso) return 0;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return 0;
  const then = new Date(y, m - 1, d).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function bucket(r: PayRunRow): Tab {
  if (r.status === "OPEN" || r.status === "PROCESSED") return "Upcoming";
  // UPDATED (closed). Anything older than 90 days is Archived.
  if (daysAgo(r.pay_date) > 90) return "Archived";
  return "Paid";
}

export function PayRunsList({ runs }: { runs: PayRunRow[] }) {
  const [tab, setTab] = useState<Tab>("Upcoming");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      Upcoming: 0, Paid: 0, Archived: 0, Failed: 0,
    };
    for (const r of runs) c[bucket(r)] += 1;
    return c;
  }, [runs]);

  const visible = useMemo(() => {
    return runs.filter((r) => {
      if (bucket(r) !== tab) return false;
      if (typeFilter !== "ALL") {
        if (typeFilter === "REGULAR" && r.is_off_cycle) return false;
        if (typeFilter !== "REGULAR" && r.run_type !== typeFilter) return false;
      }
      if (startDate && r.pay_date < startDate) return false;
      if (endDate && r.pay_date > endDate) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.period_label.toLowerCase().includes(q) &&
          !r.name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [runs, tab, typeFilter, startDate, endDate, search]);

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-5 border-b text-sm">
        {(["Upcoming", "Paid", "Archived", "Failed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2 font-semibold transition",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            <span
              className={cn(
                "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                tab === t
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-title + right-side controls (search) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {tab} · Showing {visible.length} of {counts[tab]}
        </div>
        <input
          type="search"
          placeholder="Search pay run"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-input bg-muted/30 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Pay run type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal text-foreground"
          >
            <option value="ALL">All types</option>
            <option value="REGULAR">Regular</option>
            <option value="BONUS">Bonus (off-cycle)</option>
            <option value="COMMISSION">Commission (off-cycle)</option>
            <option value="TERMINAL">Termination (§14)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Pay date from
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Pay date to
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal text-foreground"
          />
        </label>
        {(typeFilter !== "ALL" || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter("ALL");
              setStartDate("");
              setEndDate("");
            }}
            className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Pay run</TableHead>
              <TableHead className="px-5">Pay date</TableHead>
              <TableHead className="px-5">Rate</TableHead>
              <TableHead className="px-5 text-right">Employees</TableHead>
              <TableHead className="px-5 text-right">Net (USD)</TableHead>
              <TableHead className="px-5">Status</TableHead>
              <TableHead className="px-5 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  {tab === "Failed"
                    ? "No failed pay runs. Anything that hits a processing error will appear here."
                    : counts[tab] === 0
                      ? `No ${tab.toLowerCase()} pay runs.`
                      : "No pay runs match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => <PayRunRowView key={r.name} r={r} tab={tab} />)
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-amber-100 text-amber-800" },
  PROCESSED: { label: "Processed", cls: "bg-blue-100 text-blue-800" },
  UPDATED: { label: "Closed", cls: "bg-emerald-100 text-emerald-700" },
};

function PayRunRowView({ r, tab }: { r: PayRunRow; tab: Tab }) {
  const meta = STATUS_META[r.status] ?? { label: r.status, cls: "bg-muted text-muted-foreground" };
  return (
    <TableRow>
      <TableCell className="px-5 align-middle">
        <Link
          href={`/payroll/${encodeURIComponent(r.name)}` as Route}
          className="font-semibold text-primary hover:underline"
        >
          {r.period_label}
        </Link>
        {r.is_off_cycle ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
            Off-cycle · {r.run_type[0] + r.run_type.slice(1).toLowerCase()}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="px-5 align-middle">{fmtDate(r.pay_date)}</TableCell>
      <TableCell className="px-5 align-middle text-sm text-muted-foreground">
        ZiG {r.exchange_rate.toFixed(2)}
      </TableCell>
      <TableCell className="px-5 align-middle text-right">
        {r.payslipCount || "—"}
      </TableCell>
      <TableCell className="px-5 align-middle text-right font-semibold">
        {r.payslipCount ? usd(r.netUsdTotal) : "—"}
      </TableCell>
      <TableCell className="px-5 align-middle">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            meta.cls,
          )}
        >
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="px-5 align-middle text-right">
        {tab === "Upcoming" && r.status === "OPEN" ? (
          <Link
            href={`/payroll/${encodeURIComponent(r.name)}/run` as Route}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Run payroll
          </Link>
        ) : (
          <Link
            href={`/payroll/${encodeURIComponent(r.name)}` as Route}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View →
          </Link>
        )}
      </TableCell>
    </TableRow>
  );
}
