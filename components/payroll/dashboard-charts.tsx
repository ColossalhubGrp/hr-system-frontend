"use client";

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

// ── Formatters ─────────────────────────────────────────────────────

const num = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Trend chart ────────────────────────────────────────────────────

export interface TrendPoint {
  label: string;
  value: number;
  isForecast?: boolean;
}

export function TrendChart({
  points,
  height = 240,
  color = "#059669",
  label,
}: {
  points: TrendPoint[];
  height?: number;
  color?: string;
  label?: string;
}) {
  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "Net pay (USD)",
        data: points.map((p) => p.value),
        borderColor: color,
        backgroundColor: `${color}25`,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: points.map((p) => (p.isForecast ? 5 : 4)),
        pointBackgroundColor: points.map((p) => (p.isForecast ? "#ffffff" : color)),
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };
  return (
    <div className="rounded-xl border bg-card p-5">
      {label && (
        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      <div style={{ height }}>
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${usd(Number(ctx.raw ?? 0))}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: (v) => num(Number(v)) },
                grid: { color: "rgba(0,0,0,0.06)" },
              },
              x: { grid: { display: false } },
            },
          }}
        />
      </div>
    </div>
  );
}

// ── Composition donut ─────────────────────────────────────────────

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const data = {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => s.value),
        backgroundColor: slices.map((s) => s.color),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };
  return (
    // Always stack — donut on top, legend below — so the legend has
    // the full card width for its label / percent / value columns.
    // The old sm:flex-row broke at ~100% zoom because the card
    // itself isn't 640px wide even when the viewport is.
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" style={{ width: 176, height: 176 }}>
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const v = Number(ctx.raw ?? 0);
                    const pct = total > 0 ? (v / total) * 100 : 0;
                    return ` ${ctx.label}: ${usd(v)} (${pct.toFixed(1)}%)`;
                  },
                },
              },
            },
          }}
        />
        {centerLabel && centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {centerLabel}
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground">
              {centerValue}
            </div>
          </div>
        )}
      </div>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((s) => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <li key={s.label} className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="flex-1 min-w-0 truncate text-foreground/80">
                {s.label}
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                {pct.toFixed(1)}%
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-foreground text-right">
                {num(s.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Horizontal bars ───────────────────────────────────────────────

export function BarsCard({
  title,
  rows,
  color = "#4f46e5",
  emptyLabel = "No data yet.",
  height = 260,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  color?: string;
  emptyLabel?: string;
  height?: number;
}) {
  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: "Net pay (USD)",
        data: rows.map((r) => r.value),
        backgroundColor: color,
        borderRadius: 6,
        maxBarThickness: 22,
      },
    ],
  };
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div style={{ height }}>
          <Bar
            data={data}
            options={{
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${usd(Number(ctx.raw ?? 0))}`,
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: { callback: (v) => num(Number(v)) },
                  grid: { color: "rgba(0,0,0,0.06)" },
                },
                y: { grid: { display: false } },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── KPI tile (server-safe) ────────────────────────────────────────

export function KpiTile({
  label,
  value,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "emerald" | "amber" | "rose";
}) {
  const accentCls = {
    primary: "text-primary",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[accent];
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${accentCls}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
