import type { OverviewData } from "../_lib/overview-data";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const str = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
    : abs >= 1_000
      ? `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
      : abs.toFixed(0);
  return `${n < 0 ? "−" : ""}${str}`;
}

type TileProps = {
  label: string;
  value: string;
  sub?: string;
  trend?: number[];
  trendColor?: "primary" | "emerald" | "rose" | "amber";
  accent?: "primary" | "emerald" | "rose";
};

/**
 * 6-tile KPI strip at the top of the Accounting Overview.
 * Each tile: label (10px uppercase), big number, caption + sparkline.
 * Sparklines are inline SVG — no runtime chart lib.
 */
export function KpiStrip({ data }: { data: OverviewData }) {
  const { kpis, monthly } = data;
  const revenueTrend = monthly.map((m) => m.revenue);
  const expenseTrend = monthly.map((m) => m.expenses);
  const netTrend = monthly.map((m) => m.revenue - m.expenses);

  // AR / AP sparklines show the trend of what's being INVOICED month
  // over month — a rough proxy for pipeline growth. Full aging would
  // need Payment-Entry allocation history, which is heavier.
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile
        label="Revenue · MTD"
        value={`$${fmtMoney(kpis.revenueMtd)}`}
        sub="Submitted this month"
        trend={revenueTrend}
        trendColor="emerald"
        accent="emerald"
      />
      <KpiTile
        label="Expenses · MTD"
        value={`$${fmtMoney(kpis.expensesMtd)}`}
        sub="Submitted this month"
        trend={expenseTrend}
        trendColor="rose"
      />
      <KpiTile
        label="Net · MTD"
        value={`$${fmtMoney(kpis.netMtd)}`}
        sub="Revenue − expenses"
        trend={netTrend}
        trendColor={kpis.netMtd >= 0 ? "emerald" : "rose"}
        accent={kpis.netMtd >= 0 ? "emerald" : "rose"}
      />
      <KpiTile
        label="A/R outstanding"
        value={`$${fmtMoney(kpis.arOutstanding)}`}
        sub={kpis.overdueCount > 0
          ? `${kpis.overdueCount} invoice${kpis.overdueCount === 1 ? "" : "s"} overdue`
          : "On track"}
        accent={kpis.overdueCount > 0 ? "rose" : undefined}
      />
      <KpiTile
        label="A/P outstanding"
        value={`$${fmtMoney(kpis.apOutstanding)}`}
        sub="Owed to suppliers"
      />
      <KpiTile
        label="12-mo gross"
        value={`$${fmtMoney(revenueTrend.reduce((a, b) => a + b, 0))}`}
        sub="Rolling revenue"
        trend={revenueTrend}
        trendColor="primary"
        accent="primary"
      />
    </section>
  );
}

function KpiTile({ label, value, sub, trend, trendColor = "primary", accent }: TileProps) {
  const borderCls = accent === "emerald" ? "border-emerald-200/70"
    : accent === "rose" ? "border-rose-200/70"
    : accent === "primary" ? "border-primary/25"
    : "border-border";
  const valueCls = accent === "emerald" ? "text-emerald-700"
    : accent === "rose" ? "text-rose-700"
    : accent === "primary" ? "text-primary"
    : "text-foreground";

  return (
    <div className={`flex flex-col gap-1 rounded-xl border bg-card p-3 ${borderCls}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {trend && trend.length > 1 ? <Delta trend={trend} /> : null}
      </div>
      <div className={`text-[20px] font-bold leading-tight tabular-nums ${valueCls}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      {trend && trend.length > 1 ? (
        <Sparkline values={trend} color={trendColor} />
      ) : (
        <div className="h-5" aria-hidden /> /* keep tile heights uniform */
      )}
    </div>
  );
}

function Delta({ trend }: { trend: number[] }) {
  const last = trend[trend.length - 1] ?? 0;
  const prev = trend[trend.length - 2] ?? 0;
  if (!prev) return (
    <span className="inline-flex items-center text-[9px] font-semibold text-muted-foreground">
      <Minus className="h-2.5 w-2.5" />
    </span>
  );
  const pct = ((last - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const colour = up ? "text-emerald-700" : "text-rose-700";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${colour}`}>
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Sparkline({ values, color }: { values: number[]; color: "primary" | "emerald" | "rose" | "amber" }) {
  const W = 90, H = 20, PAD = 1;
  const max = Math.max(1, ...values.map(Math.abs));
  const n = values.length;
  const points = values.map((v, i) => {
    const x = PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2);
    const y = H / 2 - (v / max) * (H / 2 - PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = color === "emerald" ? "stroke-emerald-500"
    : color === "rose" ? "stroke-rose-500"
    : color === "amber" ? "stroke-amber-500"
    : "stroke-primary";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-5 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={stroke} />
    </svg>
  );
}
