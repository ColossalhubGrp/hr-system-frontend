import Link from "next/link";
import type { Route } from "next";
import {
  Database,
  Gauge,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Percent,
  Hash,
} from "lucide-react";
import { fetchDataStewardBoard } from "@/lib/frappe/data-steward";

export const metadata = { title: "Data Steward · Colossal HR" };

export default async function DataStewardPage() {
  const board = await fetchDataStewardBoard();
  const critIssues = board.quality.filter((q) => q.severity === "crit").length;
  const warnIssues = board.quality.filter((q) => q.severity === "warn").length;
  const totalIssueCount = board.quality.reduce((acc, q) => acc + q.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Database className="h-3.5 w-3.5" />
          Data Steward
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Data Steward workspace
        </h1>
        <p className="text-sm text-ash-600">
          Read-only inventory of the metrics powering the org dashboards,
          the reference data they depend on, and current data-quality
          probes. Edits go through the admin console or the relevant module pages.
        </p>
      </header>

      <SummaryBar
        metricCount={board.metrics.length}
        referenceCount={board.referenceData.length}
        critIssues={critIssues}
        warnIssues={warnIssues}
        totalIssueCount={totalIssueCount}
      />

      <MetricCatalog rows={board.metrics} />
      <ReferenceData rows={board.referenceData} />
      <DataQualityPanel rows={board.quality} />
    </div>
  );
}

// ---------- Summary bar ----------

function SummaryBar({
  metricCount,
  referenceCount,
  critIssues,
  warnIssues,
  totalIssueCount,
}: {
  metricCount: number;
  referenceCount: number;
  critIssues: number;
  warnIssues: number;
  totalIssueCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile
        icon={<Gauge className="h-4 w-4" />}
        label="Metrics tracked"
        value={metricCount.toLocaleString()}
        tone="ink"
      />
      <Tile
        icon={<Layers className="h-4 w-4" />}
        label="Reference taxonomies"
        value={referenceCount.toLocaleString()}
        tone="ink"
      />
      <Tile
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Critical issues"
        value={critIssues.toLocaleString()}
        tone={critIssues > 0 ? "crit" : "ok"}
      />
      <Tile
        icon={<Info className="h-4 w-4" />}
        label="Quality findings"
        value={`${totalIssueCount.toLocaleString()} (${warnIssues} warn)`}
        tone={warnIssues + critIssues > 0 ? "warn" : "ok"}
      />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ink" | "ok" | "warn" | "crit";
}) {
  const toneCls =
    tone === "crit"
      ? "border-fall/30 bg-fall/[0.06] text-fall"
      : tone === "warn"
        ? "border-amber-300/40 bg-amber-50 text-amber-800"
        : tone === "ok"
          ? "border-rise/30 bg-rise/[0.06] text-rise"
          : "border-hairline bg-surface text-ink-800";
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border px-4 py-3 shadow-card ${toneCls}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

// ---------- Metric catalog ----------

function MetricCatalog({
  rows,
}: {
  rows: Awaited<ReturnType<typeof fetchDataStewardBoard>>["metrics"];
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ash-500">
          <Gauge className="h-3.5 w-3.5" />
          Metric catalog
        </h2>
        <span className="text-xs text-ash-500">
          Versioned in code · live values
        </span>
      </header>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-canvas/60 text-xs uppercase tracking-wide text-ash-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Metric</th>
              <th className="px-4 py-2.5 text-left font-medium">Source</th>
              <th className="px-4 py-2.5 text-left font-medium">Filter</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              <th className="px-4 py-2.5 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((m) => (
              <tr key={m.id} className="hover:bg-canvas/40">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-ink-800">{m.label}</div>
                  <div className="text-xs text-ash-500">{m.description}</div>
                </td>
                <td className="px-4 py-3 align-top text-xs uppercase tracking-wide text-ash-600">
                  {m.sourceDoctype}
                </td>
                <td className="px-4 py-3 align-top">
                  <code className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ash-700">
                    {m.filterSummary}
                  </code>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <span className="inline-flex items-center gap-1 text-base font-semibold text-ink-800">
                    {m.format === "percent" ? (
                      <Percent className="h-3 w-3 text-ash-500" />
                    ) : (
                      <Hash className="h-3 w-3 text-ash-500" />
                    )}
                    {m.format === "percent"
                      ? `${m.value}%`
                      : m.value.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  {m.drilldown && (
                    <Link
                      href={m.drilldown as Route}
                      className="inline-flex items-center gap-1 text-xs text-ink-700 hover:underline"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Reference data ----------

function ReferenceData({
  rows,
}: {
  rows: Awaited<ReturnType<typeof fetchDataStewardBoard>>["referenceData"];
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ash-500">
          <Layers className="h-3.5 w-3.5" />
          Reference data
        </h2>
        <span className="text-xs text-ash-500">
          Taxonomies the rest of the system pulls from
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((r) => (
          <div
            key={r.doctype}
            className="rounded-card border border-hairline bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-ash-500">
                  {r.doctype}
                </p>
                <p className="text-sm font-semibold text-ink-800">{r.label}</p>
              </div>
              <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-800">
                {r.count.toLocaleString()}
              </span>
            </div>
            <Link
              href={r.drilldown as Route}
              className="mt-3 inline-flex items-center gap-1 text-xs text-ink-700 hover:underline"
            >
              Manage
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- Data quality ----------

function DataQualityPanel({
  rows,
}: {
  rows: Awaited<ReturnType<typeof fetchDataStewardBoard>>["quality"];
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ash-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          Data quality
        </h2>
        <span className="text-xs text-ash-500">
          Orphan / integrity probes
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {rows.map((q) => {
          const sevTone =
            q.severity === "crit"
              ? "border-fall/40 bg-fall/[0.04]"
              : q.severity === "warn" && q.count > 0
                ? "border-amber-300/50 bg-amber-50/40"
                : "border-hairline bg-surface";
          const badge =
            q.count === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-chip bg-rise/10 px-2 py-0.5 text-[11px] font-medium text-rise">
                <CheckCircle2 className="h-3 w-3" /> Clean
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[11px] font-semibold ${
                  q.severity === "crit"
                    ? "bg-fall/15 text-fall"
                    : "bg-amber-200/70 text-amber-900"
                }`}
              >
                {q.count.toLocaleString()}
              </span>
            );
          return (
            <li
              key={q.id}
              className={`flex items-start justify-between gap-3 rounded-card border px-4 py-3 shadow-card ${sevTone}`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-ink-800">{q.label}</span>
                <span className="text-xs text-ash-600">{q.description}</span>
              </div>
              <div className="flex items-center gap-2">
                {badge}
                {q.drilldown && q.count > 0 && (
                  <Link
                    href={q.drilldown as Route}
                    className="inline-flex items-center gap-1 rounded-chip border border-hairline px-2 py-0.5 text-[11px] font-medium text-ash-700 hover:bg-canvas focus-ring"
                  >
                    Fix
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
