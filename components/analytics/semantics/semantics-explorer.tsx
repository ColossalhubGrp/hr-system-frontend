"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
  OverrideStatus,
  SemanticDomain,
  SemanticListResponse,
  SemanticMetric,
} from "./types";
import { MetricDetail } from "./metric-detail";
import { RelationshipsExplorer } from "./relationships-explorer";
import { BusinessContextEditor } from "./business-context-editor";
import { DatasetsExplorer } from "./datasets-explorer";
import { CompiledYamlPanel } from "./compiled-yaml-panel";

/**
 * The main /analytics/semantics client component. Renders a left rail
 * of domains → metrics and a main area that shows the selected
 * metric's card. Detail drawer + edit flow ship in Phase 1.4c; this
 * turn's job is a solid navigable list, live active-model badge, and
 * override-status pills so an editor can immediately see which
 * definitions have been touched.
 */

type Tab = "metrics" | "relationships" | "datasets" | "context";

export function SemanticsExplorer() {
  const [data, setData] = useState<SemanticListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("metrics");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/list", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as SemanticListResponse;
      setData(payload);
      // Auto-expand the first domain so the user sees metrics immediately.
      if (payload.domains.length > 0 && expanded.size === 0) {
        setExpanded(new Set([payload.domains[0].code]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load semantics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // load() is stable within this component; deps intentionally empty
    // to fire once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading semantic catalog…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Couldn't load semantic layer
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const totalMetrics = data.domains.reduce((n, d) => n + d.metrics.length, 0);
  const totalOverridden = data.domains.reduce(
    (n, d) => n + d.metrics.filter((m) => m.has_override).length,
    0,
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <Header
        activeModel={data.active_model}
        modelChain={data.model_chain}
        totalMetrics={totalMetrics}
        totalOverridden={totalOverridden}
        editable={data.editable}
        onReload={load}
        loading={loading}
      />
      <TabBar tab={tab} onChange={setTab} />
      {tab === "metrics" ? (
        <div className="flex flex-1 gap-4 overflow-hidden px-6 pb-6">
          <aside className="w-[340px] shrink-0 overflow-y-auto rounded-xl border bg-card">
            <DomainList
              domains={data.domains}
              expanded={expanded}
              onToggle={(code) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(code)) next.delete(code);
                  else next.add(code);
                  return next;
                })
              }
              selected={selected}
              onSelect={setSelected}
            />
          </aside>
          <main className="flex-1 overflow-y-auto rounded-xl border bg-card">
            {selected ? (
              <MetricDetail
                code={selected}
                editable={data.editable}
                key={selected}
              />
            ) : (
              <EmptySelection editable={data.editable} />
            )}
          </main>
        </div>
      ) : tab === "relationships" ? (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <RelationshipsExplorer />
        </div>
      ) : tab === "datasets" ? (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <DatasetsExplorer />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <BusinessContextEditor />
        </div>
      )}
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  metrics: "Metrics & Overrides",
  relationships: "Relationships",
  datasets: "Data",
  context: "Business Context",
};

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex items-center gap-1 border-b px-6">
      {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            tab === t
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function Header({
  activeModel,
  modelChain,
  totalMetrics,
  totalOverridden,
  editable,
  onReload,
  loading,
}: {
  activeModel: string | null;
  modelChain: string[];
  totalMetrics: number;
  totalOverridden: number;
  editable: boolean;
  onReload: () => void;
  loading: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Semantic layer
            </h1>
            <p className="text-xs text-muted-foreground">
              Browse the metrics and dimensions Ask (AI) reads from.
              {editable ? " Edit their meaning below." : " Read-only view."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ActiveModelBadge activeModel={activeModel} modelChain={modelChain} />
        <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{totalMetrics}</span> metrics ·{" "}
          <span
            className={cn(
              "font-semibold",
              totalOverridden > 0 ? "text-primary" : "text-foreground",
            )}
          >
            {totalOverridden}
          </span>{" "}
          overridden
        </span>
        <CompiledYamlPanel />
        <Button variant="ghost" size="sm" onClick={onReload} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </header>
  );
}

function ActiveModelBadge({
  activeModel,
  modelChain,
}: {
  activeModel: string | null;
  modelChain: string[];
}) {
  if (!activeModel) {
    return (
      <span className="rounded-full border border-dashed border-input bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
        no active model
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary"
      title={modelChain.length > 1 ? modelChain.join(" → ") : activeModel}
    >
      <GitBranch className="h-3 w-3" />
      <code className="font-mono">{activeModel}</code>
      {modelChain.length > 1 && (
        <span className="text-primary/70">· inherits {modelChain.length - 1}</span>
      )}
    </span>
  );
}

// ── Domain / metric list ───────────────────────────────────────────

function DomainList({
  domains,
  expanded,
  onToggle,
  selected,
  onSelect,
}: {
  domains: SemanticDomain[];
  expanded: Set<string>;
  onToggle: (code: string) => void;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <ul className="divide-y">
      {domains.map((d) => {
        const isOpen = expanded.has(d.code);
        const overridden = d.metrics.filter((m) => m.has_override).length;
        return (
          <li key={d.code}>
            <button
              type="button"
              onClick={() => onToggle(d.code)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/40"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">{d.title}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {overridden > 0 && (
                  <span className="mr-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
                    {overridden}
                  </span>
                )}
                {d.metrics.length}
              </span>
            </button>
            {isOpen && (
              <ul className="pb-2">
                {d.metrics.map((m) => (
                  <li key={m.code}>
                    <MetricRow
                      metric={m}
                      selected={m.code === selected}
                      onSelect={() => onSelect(m.code)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MetricRow({
  metric,
  selected,
  onSelect,
}: {
  metric: SemanticMetric;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-1.5 pl-9 text-left text-xs transition-colors",
        selected
          ? "bg-primary/10 text-foreground"
          : "text-foreground/80 hover:bg-muted/40",
      )}
    >
      <span className="flex-1 truncate">{metric.title}</span>
      {metric.has_override && (
        <StatusPill status={metric.override_status} version={metric.override_version} />
      )}
    </button>
  );
}

// ── Main-area cards ────────────────────────────────────────────────

function EmptySelection({ editable }: { editable: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-foreground">
        Pick a metric on the left to see its definition
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        {editable ? (
          <>
            You have edit rights. Open a metric on the left to see its
            definition and propose a change — changes save as a draft
            first and become live once reviewed.
          </>
        ) : (
          <>You can view metric definitions but not change them.</>
        )}
      </p>
    </div>
  );
}

// ── Small pieces ───────────────────────────────────────────────────

function StatusPill({
  status,
  version,
  size = "sm",
}: {
  status: OverrideStatus | string | null;
  version: number | null;
  size?: "sm" | "lg";
}) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-1.5 py-0 text-[9px]" : "px-2.5 py-1 text-[11px]",
        pillClass(status),
      )}
    >
      <StatusDot status={status} />
      {status}
      {version != null && <span className="opacity-70">v{version}</span>}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls = {
    Published: "bg-emerald-500",
    Candidate: "bg-blue-500",
    "Under Review": "bg-amber-500",
    Rejected: "bg-rose-500",
    Superseded: "bg-muted-foreground",
  }[status] ?? "bg-muted-foreground";
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cls)} />;
}

function pillClass(status: string): string {
  switch (status) {
    case "Published":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "Candidate":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "Under Review":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Rejected":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    case "Superseded":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
}

