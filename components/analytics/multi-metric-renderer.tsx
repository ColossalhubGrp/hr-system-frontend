"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Download,
  ImageDown,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MultiPayload, MultiSlice } from "./types";

/**
 * Dual-axis combo chart for a 2-metric compound answer.
 *
 * The two slices share a categorical dimension (e.g. department). We
 * render metric A as bars on the left Y-axis, metric B as a line on
 * the right Y-axis. This is the standard "compare two metrics with
 * different units" convention (headcount vs currency, count vs
 * percentage) — reading the two magnitudes on a shared X-axis is the
 * whole point of the compound question.
 *
 * Falls back to two side-by-side single-metric charts if the shared
 * dimension can't be resolved (defensive — shouldn't happen because
 * the planner enforces `dimensions` equality).
 */

const SERIES_COLORS = ["#4f46e5", "#f59e0b"];
const CHART_HEIGHT = 320;
const CHART_HEIGHT_TALL = 560;
const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export function MultiMetricRenderer({ multi }: { multi: MultiPayload }) {
  const slices = multi.slices;
  if (slices.length !== 2) {
    return <FallbackList slices={slices} />;
  }
  const [a, b] = slices;
  const catField = a.viz.category_field ?? a.viz.time_field;
  const catFieldB = b.viz.category_field ?? b.viz.time_field;
  if (!catField || !catFieldB) {
    return <FallbackList slices={slices} />;
  }
  return <ComboCard a={a} b={b} categoryFieldA={catField} categoryFieldB={catFieldB} />;
}

function ComboCard({
  a,
  b,
  categoryFieldA,
  categoryFieldB,
}: {
  a: MultiSlice;
  b: MultiSlice;
  categoryFieldA: string;
  categoryFieldB: string;
}) {
  const [sortDesc, setSortDesc] = useState(true);
  const [topN, setTopN] = useState<number>(Math.min(a.data.row_count, 15));
  const [expanded, setExpanded] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const merged = useMemo(
    () => mergeSlices(a, b, categoryFieldA, categoryFieldB, sortDesc, topN),
    [a, b, categoryFieldA, categoryFieldB, sortDesc, topN],
  );

  const title = `${a.data.metric.name} vs ${b.data.metric.name}`;
  const catLabel = a.viz.category_label ?? "Category";

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {merged.length} row{merged.length === 1 ? "" : "s"} · {catLabel}
              {a.data.row_count > topN && <span> · showing top {topN}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {a.data.row_count > 5 && (
              <div className="mr-1 hidden items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] sm:flex">
                <span className="text-muted-foreground">Top</span>
                <select
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="cursor-pointer bg-transparent text-foreground focus:outline-none"
                >
                  {[5, 10, 15, 25, 50, a.data.row_count]
                    .filter((v, i, arr) => v > 0 && v <= a.data.row_count && arr.indexOf(v) === i)
                    .sort((x, y) => x - y)
                    .map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                </select>
              </div>
            )}
            <IconBtn
              label={sortDesc ? "Sort ascending" : "Sort descending"}
              onClick={() => setSortDesc((v) => !v)}
            >
              {sortDesc ? (
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpNarrowWide className="h-3.5 w-3.5" />
              )}
            </IconBtn>
            <IconBtn label="Expand" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Download PNG" onClick={() => downloadPng(chartRef, title)}>
              <ImageDown className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Download CSV" onClick={() => downloadCsv(title, merged, a, b)}>
              <Download className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </div>
        <div ref={chartRef} className="p-4">
          <ComboChart
            data={merged}
            a={a}
            b={b}
            hidden={hidden}
            onToggle={(key) =>
              setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            height={CHART_HEIGHT}
          />
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <ComboChart
              data={merged}
              a={a}
              b={b}
              hidden={hidden}
              onToggle={(key) =>
                setHidden((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              height={CHART_HEIGHT_TALL}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Chart body ─────────────────────────────────────────────────────

type MergedRow = { label: string; a: number; b: number };

function ComboChart({
  data,
  a,
  b,
  hidden,
  onToggle,
  height,
}: {
  data: MergedRow[];
  a: MultiSlice;
  b: MultiSlice;
  hidden: Set<string>;
  onToggle: (key: string) => void;
  height: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={58}
        />
        <YAxis
          yAxisId="left"
          tick={AXIS_TICK}
          tickFormatter={(v) => formatCompact(v)}
          stroke={SERIES_COLORS[0]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={AXIS_TICK}
          tickFormatter={(v) => formatCompact(v)}
          stroke={SERIES_COLORS[1]}
        />
        <Tooltip
          cursor={{ fill: "rgba(79,70,229,0.06)" }}
          content={
            <ComboTooltip
              nameA={a.data.metric.name}
              nameB={b.data.metric.name}
              formatA={a.data.metric.format}
              formatB={b.data.metric.format}
              unitA={a.data.metric.unit}
              unitB={b.data.metric.unit}
            />
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          onClick={(o) => {
            const key = o?.dataKey;
            if (typeof key === "string") onToggle(key);
          }}
        />
        <Bar
          yAxisId="left"
          dataKey="a"
          name={a.data.metric.name}
          hide={hidden.has("a")}
          fill={SERIES_COLORS[0]}
          radius={4}
          barSize={30}
        >
          <LabelList
            dataKey="a"
            position="top"
            formatter={(v: number) => formatCompact(v)}
            style={{ fill: SERIES_COLORS[0], fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="b"
          name={b.data.metric.name}
          hide={hidden.has("b")}
          stroke={SERIES_COLORS[1]}
          strokeWidth={2.5}
          dot={{ r: 4, fill: SERIES_COLORS[1] }}
          activeDot={{ r: 6 }}
        >
          <LabelList
            dataKey="b"
            position="top"
            formatter={(v: number) => formatCompact(v)}
            style={{ fill: SERIES_COLORS[1], fontSize: 10, fontWeight: 600 }}
          />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ComboTooltip({
  active,
  payload,
  label,
  nameA,
  nameB,
  formatA,
  formatB,
  unitA,
  unitB,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value: unknown; color?: string; name?: string }[];
  label?: string;
  nameA: string;
  nameB: string;
  formatA: string;
  formatB: string;
  unitA: string;
  unitB: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-[11px] font-semibold text-foreground">{label}</p>}
      {payload.map((p, i) => {
        const isA = p.dataKey === "a";
        const name = isA ? nameA : nameB;
        const value = formatValue(p.value, isA ? formatA : formatB, isA ? unitA : unitB);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{name}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Merge + fallbacks ──────────────────────────────────────────────

function mergeSlices(
  a: MultiSlice,
  b: MultiSlice,
  categoryFieldA: string,
  categoryFieldB: string,
  sortDesc: boolean,
  topN: number,
): MergedRow[] {
  const bIndex = new Map<string, number>();
  for (const r of b.data.rows) {
    bIndex.set(safeLabel(r[categoryFieldB]), toNumber(r[b.viz.value_field]));
  }
  const rows: MergedRow[] = a.data.rows.map((r) => {
    const key = safeLabel(r[categoryFieldA]);
    return {
      label: key,
      a: toNumber(r[a.viz.value_field]),
      b: bIndex.get(key) ?? 0,
    };
  });
  // Any rows only in b (missing from a) get added with a=0 so the user
  // still sees them — otherwise the two datasets look mysteriously
  // trimmed to just a's keys.
  for (const r of b.data.rows) {
    const key = safeLabel(r[categoryFieldB]);
    if (!rows.some((row) => row.label === key)) {
      rows.push({ label: key, a: 0, b: toNumber(r[b.viz.value_field]) });
    }
  }
  rows.sort((x, y) => (sortDesc ? y.a - x.a : x.a - y.a));
  return rows.slice(0, Math.max(1, Math.min(topN, rows.length)));
}

function FallbackList({ slices }: { slices: MultiSlice[] }) {
  // Defensive — two separate mini tables so the user still sees the
  // data if the combo chart can't align them.
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {slices.map((s, i) => (
        <div key={i} className="rounded-xl border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {s.data.metric.name}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{s.data.row_count} rows</p>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className="h-7 w-7"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

async function downloadPng(chartRef: React.RefObject<HTMLDivElement>, title: string) {
  const el = chartRef.current;
  if (!el) return;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(title)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("PNG download failed:", err);
  }
}

function downloadCsv(title: string, rows: MergedRow[], a: MultiSlice, b: MultiSlice) {
  const header = ["label", a.data.metric.name, b.data.metric.name].map(csvEscape).join(",");
  const body = rows
    .map((r) => [csvEscape(r.label), String(r.a), String(r.b)].join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatValue(value: unknown, format: string, unit: string): string {
  const n = toNumber(value);
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(n)) return String(value);
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

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
}
