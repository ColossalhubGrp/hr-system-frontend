"use client";

import { useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BarChart2,
  Download,
  Table as TableIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { AnalyzeData, VizSpec } from "./types";

/**
 * Chart dispatcher. Reads the coordinator's `viz.viz_type` and
 * renders the matching Recharts component using axis + series
 * mappings the Viz Agent computed server-side. No chart-type
 * inference happens client-side — that's the agent's job.
 */
export function VizRenderer({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const empty = data.row_count === 0;
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-input bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No rows matched.
      </div>
    );
  }

  switch (viz.viz_type) {
    case "kpi_tile":
      return <KpiTile data={data} viz={viz} />;
    case "bar":
      return <BarView data={data} viz={viz} />;
    case "line":
      return <LineView data={data} viz={viz} />;
    case "donut":
      return <DonutView data={data} viz={viz} />;
    case "grouped_bar":
      return <GroupedBarView data={data} viz={viz} />;
    case "stacked_line":
      return <StackedLineView data={data} viz={viz} />;
    case "table":
    default:
      return <TableView data={data} viz={viz} />;
  }
}

// ── Chart theme ────────────────────────────────────────────────────

const SERIES_COLORS = [
  "#4f46e5", // indigo
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rose
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
];

const CHART_HEIGHT = 280;

// ── KPI Tile ──────────────────────────────────────────────────────

function KpiTile({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const raw = data.rows[0]?.[viz.value_field];
  const value = formatValue(raw, data.metric.format, data.metric.unit);
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {viz.value_label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
        {value}
      </p>
      {data.metric.unit && (
        <p className="mt-1 text-xs text-muted-foreground">
          {data.metric.unit}
        </p>
      )}
    </div>
  );
}

// ── Bar chart (single category dim) ───────────────────────────────

function BarView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const [sortDesc, setSortDesc] = useState(true);
  const chartData = data.rows
    .map((r) => ({
      label: safeLabel(r[viz.category_field ?? ""]),
      value: toNumber(r[viz.value_field]),
    }))
    .sort((a, b) => (sortDesc ? b.value - a.value : a.value - b.value));

  return (
    <ChartCard
      title={viz.hint}
      subtitle={`${data.row_count} rows`}
      data={data}
      extraToolbar={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={sortDesc ? "Sort ascending" : "Sort descending"}
          className="h-7 w-7"
          onClick={() => setSortDesc((v) => !v)}
        >
          {sortDesc ? (
            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpNarrowWide className="h-3.5 w-3.5" />
          )}
        </Button>
      }
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
          <Tooltip
            cursor={{ fill: "rgba(79,70,229,0.06)" }}
            formatter={(v: number) => formatValue(v, data.metric.format, data.metric.unit)}
          />
          <Bar dataKey="value" fill={SERIES_COLORS[0]} radius={[6, 6, 0, 0]} barSize={40}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => formatCompact(v)}
              style={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Line chart (single time dim) ──────────────────────────────────

function LineView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const chartData = data.rows.map((r) => ({
    label: safeLabel(r[viz.time_field ?? ""]),
    value: toNumber(r[viz.value_field]),
  }));
  return (
    <ChartCard title={viz.hint} subtitle={`${data.row_count} rows`} data={data}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
          <Tooltip formatter={(v: number) => formatValue(v, data.metric.format, data.metric.unit)} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={SERIES_COLORS[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Donut (percentage / few slices) ───────────────────────────────

function DonutView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const chartData = data.rows.map((r, i) => ({
    label: safeLabel(r[viz.category_field ?? ""]),
    value: toNumber(r[viz.value_field]),
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  const total = chartData.reduce((s, x) => s + x.value, 0);
  return (
    <ChartCard title={viz.hint} subtitle={`${data.row_count} rows`} data={data}>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
              >
                {chartData.map((slice, i) => (
                  <Cell key={i} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatValue(v, data.metric.format, data.metric.unit)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </div>
            <div className="text-lg font-bold text-foreground">
              {formatValue(total, data.metric.format, data.metric.unit)}
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {chartData.map((slice) => {
            const pct = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <li key={slice.label} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: slice.color }}
                />
                <span className="flex-1 truncate">{slice.label}</span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {pct.toFixed(1)}%
                </span>
                <span className="tabular-nums text-foreground">
                  {formatValue(slice.value, data.metric.format, data.metric.unit)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartCard>
  );
}

// ── Grouped bar (2 categorical dims) ──────────────────────────────

function GroupedBarView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const series = uniqueValues(data.rows, viz.series_field ?? "");
  const categories = uniqueValues(data.rows, viz.category_field ?? "");
  // Reshape to Recharts wide format
  const chartData = categories.map((cat) => {
    const row: Record<string, unknown> = { label: cat };
    for (const s of series) {
      const match = data.rows.find(
        (r) =>
          safeLabel(r[viz.category_field ?? ""]) === cat &&
          safeLabel(r[viz.series_field ?? ""]) === s,
      );
      row[s] = match ? toNumber(match[viz.value_field]) : 0;
    }
    return row;
  });
  return (
    <ChartCard title={viz.hint} subtitle={`${data.row_count} rows`} data={data}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
          <Tooltip formatter={(v: number) => formatValue(v, data.metric.format, data.metric.unit)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Bar
              key={s}
              dataKey={s}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Stacked line (time + categorical series) ──────────────────────

function StackedLineView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const series = uniqueValues(data.rows, viz.series_field ?? "");
  const times = uniqueValues(data.rows, viz.time_field ?? "");
  const chartData = times.map((t) => {
    const row: Record<string, unknown> = { label: t };
    for (const s of series) {
      const match = data.rows.find(
        (r) =>
          safeLabel(r[viz.time_field ?? ""]) === t &&
          safeLabel(r[viz.series_field ?? ""]) === s,
      );
      row[s] = match ? toNumber(match[viz.value_field]) : 0;
    }
    return row;
  });
  return (
    <ChartCard title={viz.hint} subtitle={`${data.row_count} rows`} data={data}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
          <Tooltip formatter={(v: number) => formatValue(v, data.metric.format, data.metric.unit)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Table (fallback) ──────────────────────────────────────────────

function TableView({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  return (
    <ChartCard title={viz.hint} subtitle={`${data.row_count} rows`} data={data}>
      <RawTable data={data} />
    </ChartCard>
  );
}

// ── Shared card + formatters ──────────────────────────────────────

/**
 * Lightdash-alike chart shell: title + row-count subtitle on the
 * left, action toolbar on the right (download CSV, swap chart↔table
 * view). Wraps around any chart body.
 */
function ChartCard({
  title,
  subtitle,
  data,
  extraToolbar,
  children,
}: {
  title: string;
  subtitle?: string;
  data?: AnalyzeData;
  extraToolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {data && (
          <div className="flex items-center gap-1">
            {extraToolbar}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={asTable ? "Show chart" : "Show as table"}
              className="h-7 w-7"
              onClick={() => setAsTable((v) => !v)}
            >
              {asTable ? <BarChart2 className="h-3.5 w-3.5" /> : <TableIcon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Download CSV"
              className="h-7 w-7"
              onClick={() => downloadCsv(title, data)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="p-4">
        {asTable && data ? <RawTable data={data} /> : children}
      </div>
    </div>
  );
}

/**
 * The plain data table — used as the fallback viz AND as the
 * "table view" toggle on any chart via ChartCard.
 */
function RawTable({ data }: { data: AnalyzeData }) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {data.columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left">{prettyColumn(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-b last:border-none">
              {data.columns.map((c) => (
                <td key={c} className="px-3 py-2">
                  {typeof r[c] === "number"
                    ? formatValue(r[c], data.metric.format, data.metric.unit)
                    : String(r[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadCsv(title: string, data: AnalyzeData) {
  const header = data.columns.map(csvEscape).join(",");
  const rows = data.rows
    .map((r) => data.columns.map((c) => csvEscape(String(r[c] ?? ""))).join(","))
    .join("\n");
  const csv = `${header}\n${rows}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
}

function formatValue(value: unknown, format: string, unit: string): string {
  const n = toNumber(value);
  if (Number.isNaN(n)) return String(value ?? "—");
  switch (format) {
    case "currency":
      return `${unit || "US$"}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "percentage":
      return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
    case "decimal":
      return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    case "duration_days":
      return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} d`;
    case "integer":
    default:
      return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function safeLabel(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(unset)";
  return String(v);
}

function uniqueValues(rows: Record<string, unknown>[], field: string): string[] {
  const seen: string[] = [];
  const seenSet = new Set<string>();
  for (const r of rows) {
    const v = safeLabel(r[field]);
    if (!seenSet.has(v)) {
      seenSet.add(v);
      seen.push(v);
    }
  }
  return seen;
}

function prettyColumn(col: string): string {
  return col.replace(/^dim[._]/, "").replace(/_/g, " ");
}
