import Link from "next/link";
import type { Route } from "next";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { OverviewData } from "../_lib/overview-data";

/**
 * Cash in and out this month, from posted payment entries — the
 * owner's first question answered without opening a report.
 */
export function CashCard({ data }: { data: OverviewData }) {
  const { inMtd, outMtd, countMtd } = data.cash;
  const net = inMtd - outMtd;
  return (
    <Link
      href={"/accounting/payment-entries" as Route}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition hover:border-primary/40"
    >
      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cash this month
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
            Received
          </span>
          <span className="font-bold tabular-nums text-foreground">
            {formatMoney(inMtd, "USD")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
            Paid out
          </span>
          <span className="font-bold tabular-nums text-foreground">
            {formatMoney(outMtd, "USD")}
          </span>
        </div>
        <div className="flex items-center justify-between border-t pt-2.5">
          <span className="text-sm font-semibold text-foreground">Net</span>
          <span
            className={`font-bold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}
          >
            {net >= 0 ? "" : "−"}{formatMoney(Math.abs(net), "USD")}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {countMtd === 0
          ? "No posted payments yet this month."
          : `From ${countMtd} posted payment entr${countMtd === 1 ? "y" : "ies"} this month.`}
      </p>
    </Link>
  );
}
