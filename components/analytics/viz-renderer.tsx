"use client";

import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
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
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BarChart2,
  BarChartHorizontal,
  ChevronsUpDown,
  Clock,
  Download,
  ImageDown,
  LineChart as LineIcon,
  Loader2,
  Maximize2,
  PieChart as PieIcon,
  Table as TableIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import type { AnalyzeData, AnalyzeResponse, CompareMode, VizSpec } from "./types";

/**
 * Chart dispatcher — reads viz.viz_type from the coordinator and
 * hands off to a specialized renderer. All charts are wrapped in
 * <ChartCard/> which owns the toolbar (chart-type switcher, sort,
 * top-N, expand, PNG download, CSV download, table view).
 *
 * Design notes:
 *   - Sort + top-N + chart-type override are UI state kept per turn
 *     (i.e. this component). Server never sees them; the underlying
 *     `data.rows` stays the source of truth.
 *   - PNG download uses html2canvas — the chart region is wrapped
 *     with a ref so we can rasterize just that div, not the whole
 *     page.
 *   - Expand uses shadcn Dialog at 90vw — same chart component
 *     re-renders bigger.
 */

export function VizRenderer({
  data,
  viz,
  question,
  canCompare = true,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  question: string;
  /** false when the metric has no time_range and compare is irrelevant. */
  canCompare?: boolean;
}) {
  if (data.row_count === 0) {
    return (
      <div className="rounded-xl border border-dashed border-input bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No rows matched.
      </div>
    );
  }
  return <ChartCard data={data} viz={viz} question={question} canCompare={canCompare} />;
}

// ── ChartCard: toolbar + state + body ─────────────────────────────

type ChartMode = "auto" | "bar" | "bar_h" | "line" | "area" | "donut" | "table";
type CompareChoice = "none" | CompareMode;

function ChartCard({
  data,
  viz,
  question,
  canCompare,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  question: string;
  canCompare: boolean;
}) {
  const [mode, setMode] = useState<ChartMode>("auto");
  const [sortDesc, setSortDesc] = useState(true);
  const [topN, setTopN] = useState<number>(Math.min(data.row_count, 25));
  const [expanded, setExpanded] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Compare state — self-contained. `compareChoice` is what the user
  // picked; `compareData` is the re-fetched payload from /analyze with
  // `compare_to` set. When choice is "none", we render the props.data
  // as-is (no compare bars/badges).
  const [compareChoice, setCompareChoice] = useState<CompareChoice>("none");
  const [compareData, setCompareData] = useState<AnalyzeData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const activeData = compareData ?? data;

  const handleCompareChange = async (choice: CompareChoice) => {
    setCompareChoice(choice);
    setCompareError(null);
    if (choice === "none") {
      setCompareData(null);
      return;
    }
    setCompareLoading(true);
    try {
      const res = await fetch("/api/analytics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, compare_to: choice }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as AnalyzeResponse;
      if (payload.refused || !payload.data) {
        throw new Error(payload.refusal_reason ?? "Compare unavailable.");
      }
      if (!payload.data.compare) {
        throw new Error("This metric has no time window to compare against.");
      }
      setCompareData(payload.data);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Compare failed.");
      setCompareData(null);
      setCompareChoice("none");
    } finally {
      setCompareLoading(false);
    }
  };

  const effectiveType = mode === "auto" ? viz.viz_type : mode;
  const hasSort = ["bar", "bar_h", "donut"].includes(effectiveType);
  const hasTopN = activeData.row_count > 5 && ["bar", "bar_h", "line", "area", "donut", "table"].includes(effectiveType);

  const sortedData = useMemo(() => {
    if (!hasSort) return activeData.rows;
    const key = viz.value_field;
    return [...activeData.rows].sort((a, b) => {
      const av = toNumber(a[key]);
      const bv = toNumber(b[key]);
      return sortDesc ? bv - av : av - bv;
    });
  }, [activeData.rows, viz.value_field, hasSort, sortDesc]);

  const displayed = useMemo(
    () => (hasTopN ? sortedData.slice(0, topN) : sortedData),
    [sortedData, hasTopN, topN],
  );

  const shownData: AnalyzeData = { ...activeData, rows: displayed, row_count: displayed.length };

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {viz.hint}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {data.row_count} row{data.row_count === 1 ? "" : "s"}
              {hasTopN && topN < data.row_count && (
                <span> · showing top {topN}</span>
              )}
            </p>
          </div>
          <Toolbar
            data={activeData}
            currentType={effectiveType}
            onTypeChange={setMode}
            hasSort={hasSort}
            sortDesc={sortDesc}
            onSortToggle={() => setSortDesc((v) => !v)}
            hasTopN={hasTopN}
            topN={topN}
            onTopN={setTopN}
            maxN={activeData.row_count}
            onExpand={() => setExpanded(true)}
            chartRef={chartRef}
            title={viz.hint}
            canCompare={canCompare}
            compareChoice={compareChoice}
            onCompareChange={handleCompareChange}
            compareLoading={compareLoading}
          />
        </div>
        {compareError && (
          <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-800 dark:text-amber-200">
            {compareError}
          </p>
        )}
        <div ref={chartRef} className="p-4">
          <ChartBody type={effectiveType} data={shownData} viz={viz} />
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{viz.hint}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <ChartBody type={effectiveType} data={shownData} viz={viz} tall />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────

const CHART_TYPE_ICONS: Record<ChartMode, React.ReactNode> = {
  auto: <BarChart2 className="h-3.5 w-3.5" />,
  bar: <BarChart2 className="h-3.5 w-3.5" />,
  bar_h: <BarChartHorizontal className="h-3.5 w-3.5" />,
  line: <LineIcon className="h-3.5 w-3.5" />,
  area: <LineIcon className="h-3.5 w-3.5" />,
  donut: <PieIcon className="h-3.5 w-3.5" />,
  table: <TableIcon className="h-3.5 w-3.5" />,
};

const CHART_TYPE_LABELS: Record<ChartMode, string> = {
  auto: "Auto",
  bar: "Vertical bar",
  bar_h: "Horizontal bar",
  line: "Line",
  area: "Area",
  donut: "Donut",
  table: "Table",
};

function Toolbar(props: {
  data: AnalyzeData;
  currentType: string;
  onTypeChange: (t: ChartMode) => void;
  hasSort: boolean;
  sortDesc: boolean;
  onSortToggle: () => void;
  hasTopN: boolean;
  topN: number;
  onTopN: (n: number) => void;
  maxN: number;
  onExpand: () => void;
  chartRef: React.RefObject<HTMLDivElement>;
  title: string;
  canCompare: boolean;
  compareChoice: CompareChoice;
  onCompareChange: (c: CompareChoice) => void;
  compareLoading: boolean;
}) {
  const {
    data,
    currentType,
    onTypeChange,
    hasSort,
    sortDesc,
    onSortToggle,
    hasTopN,
    topN,
    onTopN,
    maxN,
    onExpand,
    chartRef,
    title,
    canCompare,
    compareChoice,
    onCompareChange,
    compareLoading,
  } = props;
  return (
    <div className="flex items-center gap-1">
      {canCompare && (
        <CompareControl
          value={compareChoice}
          onChange={onCompareChange}
          loading={compareLoading}
        />
      )}
      {hasTopN && (
        <div className="mr-1 hidden items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] sm:flex">
          <span className="text-muted-foreground">Top</span>
          <select
            value={topN}
            onChange={(e) => onTopN(Number(e.target.value))}
            className="cursor-pointer bg-transparent text-foreground focus:outline-none"
          >
            {[5, 10, 25, 50, 100, maxN]
              .filter((v, i, a) => v > 0 && v <= maxN && a.indexOf(v) === i)
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
          </select>
        </div>
      )}
      {hasSort && (
        <IconBtn
          label={sortDesc ? "Sort ascending" : "Sort descending"}
          onClick={onSortToggle}
        >
          {sortDesc ? (
            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpNarrowWide className="h-3.5 w-3.5" />
          )}
        </IconBtn>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Change chart type"
            className="h-7 w-7"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {(["auto", "bar", "bar_h", "line", "area", "donut", "table"] as ChartMode[]).map((t) => (
            <DropdownMenuItem
              key={t}
              onSelect={() => onTypeChange(t)}
              className={cn(
                "text-xs",
                t === currentType && "bg-primary/[0.08] font-semibold",
              )}
            >
              <span className="mr-2">{CHART_TYPE_ICONS[t]}</span>
              {CHART_TYPE_LABELS[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <IconBtn label="Expand" onClick={onExpand}>
        <Maximize2 className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn
        label="Download PNG"
        onClick={() => downloadPng(chartRef, title)}
      >
        <ImageDown className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn
        label="Download CSV"
        onClick={() => downloadCsv(title, data)}
      >
        <Download className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  );
}

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

const COMPARE_LABELS: Record<CompareChoice, string> = {
  none: "No compare",
  previous_period: "vs prior period",
  previous_year: "vs prior year",
};

function CompareControl({
  value,
  onChange,
  loading,
}: {
  value: CompareChoice;
  onChange: (c: CompareChoice) => void;
  loading: boolean;
}) {
  const active = value !== "none";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mr-1 flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors",
            active
              ? "border-primary/40 bg-primary/[0.08] text-primary"
              : "border-input bg-background text-muted-foreground hover:text-foreground",
          )}
          aria-label="Compare to previous period"
          title="Compare to previous period"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{COMPARE_LABELS[value]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(["none", "previous_period", "previous_year"] as CompareChoice[]).map((c) => (
          <DropdownMenuItem
            key={c}
            onSelect={() => onChange(c)}
            className={cn(
              "text-xs",
              c === value && "bg-primary/[0.08] font-semibold",
            )}
          >
            {COMPARE_LABELS[c]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Body dispatcher ────────────────────────────────────────────────

function ChartBody({
  type,
  data,
  viz,
  tall = false,
}: {
  type: string;
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
}) {
  const isKpi = viz.viz_type === "kpi_tile" && type === "auto";
  const effective = isKpi ? "kpi_tile" : type;
  switch (effective) {
    case "kpi_tile":
      return <KpiTile data={data} viz={viz} />;
    case "line":
    case "stacked_line":
      return <LineView data={data} viz={viz} tall={tall} stacked={effective === "stacked_line"} />;
    case "area":
      return <AreaView data={data} viz={viz} tall={tall} />;
    case "donut":
      return <DonutView data={data} viz={viz} tall={tall} />;
    case "grouped_bar":
      return <GroupedBarView data={data} viz={viz} tall={tall} />;
    case "bar_h":
      return <BarView data={data} viz={viz} tall={tall} horizontal />;
    case "table":
      return <RawTable data={data} viz={viz} />;
    case "bar":
    default:
      return <BarView data={data} viz={viz} tall={tall} />;
  }
}

// ── Chart theme ────────────────────────────────────────────────────

const SERIES_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316",
];
// +30px vs pre-legend baseline so the top legend doesn't compress the
// plot area or overlap value labels ($45.2k, 5, 12.3%, …) rendered
// above bars/lines/areas.
const CHART_HEIGHT = 310;
const CHART_HEIGHT_TALL = 550;

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

// Every Recharts chart uses this top-aligned Legend so the chart's
// color↔series mapping is immediately visible without hovering.
// House rule: every chart in the analytics chatbot MUST show a legend
// at the top. Do not swap `verticalAlign` back to `"bottom"`.
const TOP_LEGEND_STYLE = { fontSize: 11, paddingBottom: 8 } as const;

// ── KPI Tile ──────────────────────────────────────────────────────

function KpiTile({ data, viz }: { data: AnalyzeData; viz: VizSpec }) {
  const raw = data.rows[0]?.[viz.value_field];
  const scalar = data.compare?.scalar;
  return (
    <div className="py-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {viz.value_label}
      </p>
      <p className="mt-2 text-5xl font-extrabold tracking-tight text-foreground">
        {formatValue(raw, data.metric.format, data.metric.unit)}
      </p>
      {scalar ? (
        <div className="mt-3 flex flex-col items-center gap-1">
          <DeltaBadge deltaPct={scalar.delta_pct} />
          <p className="text-[11px] text-muted-foreground">
            prior:{" "}
            <span className="font-semibold text-foreground">
              {formatValue(scalar.prior, data.metric.format, data.metric.unit)}
            </span>
            {data.compare?.prior_time_range?.start && (
              <>
                {" "}
                <span className="text-muted-foreground/70">
                  ({data.compare.prior_time_range.start} → {data.compare.prior_time_range.end})
                </span>
              </>
            )}
          </p>
        </div>
      ) : (
        data.metric.unit && (
          <p className="mt-2 text-xs text-muted-foreground">{data.metric.unit}</p>
        )
      )}
    </div>
  );
}

/**
 * Compact "+12.3%" / "–4.1%" pill with an up/down arrow. Coloured
 * green/red respecting the metric's `higher_is_better` — for now
 * default is "up = green"; refinement lives with the metric meta.
 */
function DeltaBadge({ deltaPct, small }: { deltaPct: number | null; small?: boolean }) {
  if (deltaPct === null) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground",
        small ? "text-[10px]" : "text-xs",
      )}>
        n/a
      </span>
    );
  }
  const up = deltaPct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums",
        small ? "text-[10px]" : "text-xs",
        up ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {deltaPct.toFixed(1)}%
    </span>
  );
}

/**
 * Compare lookup: given a category label, return the prior value +
 * delta% from data.compare.rows. Keyed on the same concat the server
 * used (see compare.py align()).
 */
function priorForLabel(data: AnalyzeData, label: string): { prior: number; delta_pct: number | null } | null {
  const rows = data.compare?.rows;
  if (!rows) return null;
  // Server keys are "|"-joined dim column values. For single-dim charts
  // that reduces to just the value itself. For multi-dim we still match
  // on the raw label the BarView emitted; the server key uses raw
  // dimension values, not our safeLabel("(unset)") replacement, so we
  // fall back to matching on the raw stored key too.
  const hit = rows.find((r) => r.key === label || (label === "(unset)" && (r.key === "" || r.key === "null")));
  if (!hit) return null;
  return { prior: hit.prior, delta_pct: hit.delta_pct };
}

// ── Bar (vertical + horizontal) ───────────────────────────────────

function BarView({
  data,
  viz,
  tall,
  horizontal,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
  horizontal?: boolean;
}) {
  const hasCompare = !!data.compare?.rows?.length;
  const chartData = data.rows.map((r) => {
    const label = safeLabel(r[viz.category_field ?? ""]);
    const value = toNumber(r[viz.value_field]);
    const prior = hasCompare ? priorForLabel(data, label) : null;
    return {
      label,
      value,
      prior: prior?.prior ?? 0,
      delta_pct: prior?.delta_pct ?? null,
    };
  });
  const height = tall ? CHART_HEIGHT_TALL : CHART_HEIGHT;
  const barSize = horizontal ? 18 : hasCompare ? 22 : 40;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 24, right: horizontal ? 40 : 12, left: horizontal ? 8 : 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
            <YAxis dataKey="label" type="category" tick={AXIS_TICK} width={140} />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={54}
            />
            <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(79,70,229,0.06)" }}
          content={<CustomTooltip metric={data.metric} hasCompare={hasCompare} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="rect"
          wrapperStyle={TOP_LEGEND_STYLE}
        />
        {hasCompare && (
          <Bar
            dataKey="prior"
            name="Prior"
            fill={SERIES_COLORS[0]}
            fillOpacity={0.28}
            radius={4}
            barSize={barSize}
          />
        )}
        <Bar
          dataKey="value"
          name={data.metric.name}
          fill={SERIES_COLORS[0]}
          radius={4}
          barSize={barSize}
        >
          <LabelList
            dataKey="value"
            position={horizontal ? "right" : "top"}
            formatter={(v: number) => formatCompact(v)}
            style={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
          />
          {hasCompare && (
            <LabelList
              dataKey="delta_pct"
              position={horizontal ? "insideRight" : "insideTop"}
              formatter={(v: number | null) =>
                v === null ? "" : (v >= 0 ? "+" : "") + v.toFixed(1) + "%"
              }
              style={{
                fill: "hsl(var(--foreground))",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Line ───────────────────────────────────────────────────────────

function LineView({
  data,
  viz,
  tall,
  stacked,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
  stacked?: boolean;
}) {
  const height = tall ? CHART_HEIGHT_TALL : CHART_HEIGHT;
  if (stacked && viz.series_field) {
    return <StackedLineInner data={data} viz={viz} height={height} />;
  }
  const hasCompare = !!data.compare?.rows?.length;
  const chartData = data.rows.map((r) => {
    const label = safeLabel(r[viz.time_field ?? viz.category_field ?? ""]);
    const value = toNumber(r[viz.value_field]);
    const prior = hasCompare ? priorForLabel(data, label) : null;
    return { label, value, prior: prior?.prior ?? null };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          cursor={{ stroke: SERIES_COLORS[0], strokeWidth: 1, strokeDasharray: "3 3" }}
          content={<CustomTooltip metric={data.metric} hasCompare={hasCompare} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="line"
          wrapperStyle={TOP_LEGEND_STYLE}
        />
        {hasCompare && (
          <Line
            type="monotone"
            dataKey="prior"
            name="Prior"
            stroke={SERIES_COLORS[0]}
            strokeOpacity={0.55}
            strokeWidth={1.75}
            strokeDasharray="5 4"
            dot={{ r: 2, fill: SERIES_COLORS[0], fillOpacity: 0.55 }}
            activeDot={{ r: 4 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={data.metric.name}
          stroke={SERIES_COLORS[0]}
          strokeWidth={2.5}
          dot={{ r: 3, fill: SERIES_COLORS[0] }}
          activeDot={{ r: 6 }}
        >
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: number) => formatCompact(v)}
            style={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

function StackedLineInner({ data, viz, height }: { data: AnalyzeData; viz: VizSpec; height: number }) {
  const series = uniqueValues(data.rows, viz.series_field ?? "");
  const times = uniqueValues(data.rows, viz.time_field ?? "");
  const chartData = times.map((t) => {
    const row: Record<string, unknown> = { label: t };
    for (const s of series) {
      const m = data.rows.find(
        (r) =>
          safeLabel(r[viz.time_field ?? ""]) === t &&
          safeLabel(r[viz.series_field ?? ""]) === s,
      );
      row[s] = m ? toNumber(m[viz.value_field]) : 0;
    }
    return row;
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          cursor={{ stroke: SERIES_COLORS[0], strokeWidth: 1, strokeDasharray: "3 3" }}
          content={<CustomTooltip metric={data.metric} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="line"
          wrapperStyle={TOP_LEGEND_STYLE}
          onClick={(o) => setHidden((prev) => {
            const next = new Set(prev);
            if (o?.dataKey && typeof o.dataKey === "string") {
              next.has(o.dataKey) ? next.delete(o.dataKey) : next.add(o.dataKey);
            }
            return next;
          })}
        />
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            hide={hidden.has(s)}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Area ───────────────────────────────────────────────────────────

function AreaView({
  data,
  viz,
  tall,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
}) {
  const height = tall ? CHART_HEIGHT_TALL : CHART_HEIGHT;
  const xField = viz.time_field ?? viz.category_field ?? "";
  const chartData = data.rows.map((r) => ({
    label: safeLabel(r[xField]),
    value: toNumber(r[viz.value_field]),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 24, right: 12, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          cursor={{ stroke: SERIES_COLORS[0], strokeWidth: 1, strokeDasharray: "3 3" }}
          content={<CustomTooltip metric={data.metric} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="rect"
          wrapperStyle={TOP_LEGEND_STYLE}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={data.metric.name}
          stroke={SERIES_COLORS[0]}
          strokeWidth={2.5}
          fill="url(#areaGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Donut ──────────────────────────────────────────────────────────

function DonutView({
  data,
  viz,
  tall,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
}) {
  const chartData = data.rows.map((r, i) => ({
    label: safeLabel(r[viz.category_field ?? ""]),
    value: toNumber(r[viz.value_field]),
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  const total = chartData.reduce((s, x) => s + x.value, 0);
  const size = tall ? 300 : 200;
  return (
    <div className="flex flex-col items-stretch gap-4 sm:flex-row">
      <div
        className="relative shrink-0"
        style={{ width: size, height: size + 40 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Legend
              verticalAlign="top"
              align="left"
              iconType="rect"
              wrapperStyle={TOP_LEGEND_STYLE}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="55%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.45}
              strokeWidth={2}
            >
              {chartData.map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip metric={data.metric} />} />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center text-center"
          style={{ top: 40, bottom: 0 }}
        >
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
  );
}

// ── Grouped bar ────────────────────────────────────────────────────

function GroupedBarView({
  data,
  viz,
  tall,
}: {
  data: AnalyzeData;
  viz: VizSpec;
  tall?: boolean;
}) {
  const series = uniqueValues(data.rows, viz.series_field ?? "");
  const categories = uniqueValues(data.rows, viz.category_field ?? "");
  const chartData = categories.map((cat) => {
    const row: Record<string, unknown> = { label: cat };
    for (const s of series) {
      const m = data.rows.find(
        (r) =>
          safeLabel(r[viz.category_field ?? ""]) === cat &&
          safeLabel(r[viz.series_field ?? ""]) === s,
      );
      row[s] = m ? toNumber(m[viz.value_field]) : 0;
    }
    return row;
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  return (
    <ResponsiveContainer width="100%" height={tall ? CHART_HEIGHT_TALL : CHART_HEIGHT}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={54}
        />
        <YAxis tick={AXIS_TICK} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          cursor={{ fill: "rgba(79,70,229,0.06)" }}
          content={<CustomTooltip metric={data.metric} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          iconType="rect"
          wrapperStyle={TOP_LEGEND_STYLE}
          onClick={(o) => setHidden((prev) => {
            const next = new Set(prev);
            if (o?.dataKey && typeof o.dataKey === "string") {
              next.has(o.dataKey) ? next.delete(o.dataKey) : next.add(o.dataKey);
            }
            return next;
          })}
        />
        {series.map((s, i) => (
          <Bar
            key={s}
            dataKey={s}
            hide={hidden.has(s)}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={4}
            barSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Table view ─────────────────────────────────────────────────────

function RawTable({ data, viz }: { data: AnalyzeData; viz?: VizSpec }) {
  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {data.columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left">{prettyColumn(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-b last:border-none hover:bg-muted/20">
              {data.columns.map((c) => (
                <td key={c} className="px-3 py-2 tabular-nums">
                  {typeof r[c] === "number"
                    ? formatValue(r[c], data.metric.format, data.metric.unit)
                    : safeLabel(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  metric,
  hasCompare,
}: {
  active?: boolean;
  payload?: {
    name?: string;
    value: unknown;
    color?: string;
    dataKey?: string;
    payload?: { delta_pct?: number | null };
  }[];
  label?: string;
  metric: { format: string; unit: string };
  hasCompare?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const deltaPct = hasCompare
    ? payload.find((p) => p.dataKey === "value")?.payload?.delta_pct
    : undefined;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
      {label && (
        <p className="mb-1 text-[11px] font-semibold text-foreground">{label}</p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {p.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: p.color, opacity: p.dataKey === "prior" ? 0.55 : 1 }}
            />
          )}
          <span className="text-muted-foreground">
            {p.dataKey === "prior" ? "Prior" : p.name ?? p.dataKey ?? ""}
          </span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">
            {formatValue(p.value, metric.format, metric.unit)}
          </span>
        </div>
      ))}
      {deltaPct !== undefined && deltaPct !== null && (
        <div className="mt-1.5 flex items-center justify-end gap-1 border-t pt-1.5">
          <span className="text-[10px] text-muted-foreground">delta</span>
          <DeltaBadge deltaPct={deltaPct} small />
        </div>
      )}
    </div>
  );
}

// ── Downloads ──────────────────────────────────────────────────────

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
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("PNG download failed:", err);
  }
}

function downloadCsv(title: string, data: AnalyzeData) {
  const header = data.columns.map(csvEscape).join(",");
  const rows = data.rows
    .map((r) => data.columns.map((c) => csvEscape(String(r[c] ?? ""))).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${rows}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Helpers ────────────────────────────────────────────────────────

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

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
}
