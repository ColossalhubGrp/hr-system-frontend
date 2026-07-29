"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  FileEdit,
  History,
  Loader2,
  RefreshCw,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FormulaVersion, SemanticMetricDetail } from "./types";

/**
 * The main-area detail view for one metric. Fetches its full
 * definition from the semantics detail endpoint, then renders three
 * regions:
 *
 *   1. Header — title / code / description with an active-override
 *      badge if a Formula Version is currently serving this metric.
 *   2. Definition — side-by-side "Canonical" vs "Active" panels so an
 *      editor can immediately see how a tenant override diverges from
 *      the shipped default (empty on both sides is intentional: some
 *      dimensions are inherited, not overridden).
 *   3. Version history — every Formula Version in the tenant's chain
 *      with status pills; the active one is called out. Transition
 *      buttons + Edit ship in Phase 1.4c-2 — this turn is READ.
 */

export function MetricDetail({
  code,
  editable,
}: {
  code: string;
  editable: boolean;
}) {
  const [detail, setDetail] = useState<SemanticMetricDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/semantics/detail?code=${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setDetail((await res.json()) as SemanticMetricDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading metric…
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Couldn't load metric
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={load} className="mt-4">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-6 p-6">
      <DetailHeader detail={detail} editable={editable} />
      <DefinitionCompare detail={detail} />
      <DimensionList detail={detail} />
      <VersionHistory versions={detail.versions} />
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function DetailHeader({
  detail,
  editable,
}: {
  detail: SemanticMetricDetail;
  editable: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {detail.domain}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">
          {detail.title}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {detail.code}
        </p>
        {detail.description && (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {detail.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {detail.active.served_by_override ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <FileEdit className="h-3 w-3" />
            override active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            <BadgeCheck className="h-3 w-3" />
            canonical
          </span>
        )}
        {editable && (
          // Placeholder trigger — the wired-up form ships in 1.4c-2.
          <Button variant="outline" size="sm" disabled title="Ships in Phase 1.4c-2">
            <FileEdit className="mr-1.5 h-3.5 w-3.5" /> New override
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Canonical vs Active side-by-side ───────────────────────────────

function DefinitionCompare({ detail }: { detail: SemanticMetricDetail }) {
  const c = detail.canonical;
  const a = detail.active;
  const diverges = c.computation_type !== a.computation_type
    || c.aggregation !== a.aggregation
    || (c.custom_sql || "") !== (a.custom_sql || "")
    || (c.formula || "") !== (a.formula || "");
  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Definition
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <DefinitionPanel
          title="Canonical"
          badge="ships with the app"
          body={c}
          format={detail.format}
          unit={detail.unit}
          precision={detail.precision}
          higherIsBetter={detail.higher_is_better}
        />
        <DefinitionPanel
          title="Active"
          badge={
            a.served_by_override
              ? `served by override in ${detail.active_model}`
              : "same as canonical"
          }
          body={a}
          format={detail.format}
          unit={detail.unit}
          precision={detail.precision}
          higherIsBetter={detail.higher_is_better}
          emphasized={a.served_by_override}
        />
      </div>
      {!diverges && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          No override active — the canonical definition is what runs when this metric is queried.
        </p>
      )}
    </section>
  );
}

function DefinitionPanel({
  title,
  badge,
  body,
  format,
  unit,
  precision,
  higherIsBetter,
  emphasized,
}: {
  title: string;
  badge: string;
  body: SemanticMetricDetail["canonical"];
  format: string;
  unit: string;
  precision: number;
  higherIsBetter: boolean;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        emphasized
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-input bg-background/60",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{badge}</p>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[11px]">
        <Row k="Computation" v={humanComputation(body.computation_type)} />
        {body.source_doctype && <Row k="Source" v={body.source_doctype} />}
        {body.aggregation && (
          <Row
            k="Aggregation"
            v={
              body.aggregation_field
                ? `${body.aggregation.toUpperCase()}(${body.aggregation_field})`
                : body.aggregation.toUpperCase()
            }
          />
        )}
        {body.formula && (
          <Row k="Formula" v={<code className="font-mono text-[11px]">{body.formula}</code>} />
        )}
        <Row k="Format" v={format} />
        {unit && <Row k="Unit" v={unit} />}
        <Row k="Precision" v={String(precision)} />
        <Row k="Direction" v={higherIsBetter ? "higher is better" : "lower is better"} />
      </dl>
      {body.custom_sql && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SQL template
          </p>
          <pre className="max-h-56 overflow-auto rounded-lg bg-background/80 p-2.5 text-[10px] leading-relaxed">
            <code className="font-mono whitespace-pre-wrap break-words">
              {body.custom_sql}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Dimensions ─────────────────────────────────────────────────────

function DimensionList({ detail }: { detail: SemanticMetricDetail }) {
  if (detail.dimensions.length === 0) return null;
  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Allowed dimensions ({detail.dimensions.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {detail.dimensions.map((d) => (
          <span
            key={d.code}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]",
              d.default_slice
                ? "bg-primary/15 text-primary"
                : "border bg-background text-foreground",
            )}
            title={d.code}
          >
            {d.name}
            {d.required && <span className="text-rose-500">*</span>}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        <span className="text-rose-500">*</span> = required · highlighted = default slice
      </p>
    </section>
  );
}

// ── Version history ────────────────────────────────────────────────

function VersionHistory({ versions }: { versions: FormulaVersion[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Version history ({versions.length})
        </p>
      </div>
      {versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          No overrides authored yet. The canonical definition is the only version in play.
        </div>
      ) : (
        <ul className="space-y-2">
          {versions.map((v) => (
            <VersionRow key={v.name} version={v} />
          ))}
        </ul>
      )}
    </section>
  );
}

function VersionRow({ version }: { version: FormulaVersion }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li
      className={cn(
        "rounded-xl border p-3",
        version.is_active
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-input bg-background",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <StatusChip status={version.status} version={version.version} />
        <span className="flex-1 truncate text-xs">
          <span className="font-semibold text-foreground">
            {version.override_kind || "—"}
          </span>
          {version.change_reason && (
            <span className="text-muted-foreground"> · {truncate(version.change_reason, 80)}</span>
          )}
        </span>
        <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
          <UserIcon className="h-3 w-3" />
          {short(version.created_by_user)}
        </span>
        {version.modified && (
          <span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex">
            <Clock className="h-3 w-3" />
            {shortDate(version.modified)}
          </span>
        )}
        {version.is_active && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
            ACTIVE
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3 text-[11px]">
          {version.has_assumptions && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {version.assumption_notes || "This override uses best-fit proxies — double-check before citing."}
              </span>
            </div>
          )}
          {version.expression && (
            <Field label="Formula expression">
              <code className="font-mono text-[11px]">{version.expression}</code>
            </Field>
          )}
          {version.custom_sql && (
            <Field label="Custom SQL">
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-2 text-[10px]">
                <code className="font-mono whitespace-pre-wrap break-words">
                  {version.custom_sql}
                </code>
              </pre>
            </Field>
          )}
          {version.source_field && (
            <Field label="Simple aggregation">
              {version.aggregation?.toUpperCase()}({version.aggregation_field || version.source_field})
            </Field>
          )}
          <Field label="Change reason">{version.change_reason || "—"}</Field>
          {version.rejection_reason && (
            <Field label="Rejection reason">
              <span className="text-rose-700 dark:text-rose-300">{version.rejection_reason}</span>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <span>Owner model: <code className="font-mono">{version.owner_model}</code></span>
            {version.reviewed_by && <span>Reviewed by: {short(version.reviewed_by)}</span>}
            {version.effective_date && <span>Effective: {version.effective_date}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

// ── Small helpers ──────────────────────────────────────────────────

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground">{v ?? "—"}</dd>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function StatusChip({ status, version }: { status: string; version: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        pillClass(status),
      )}
    >
      {status} v{version}
    </span>
  );
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

function humanComputation(t: string | null): string {
  switch (t) {
    case "simple":
      return "Simple aggregation";
    case "computed":
      return "Computed (formula)";
    case "sql":
      return "Custom SQL template";
    default:
      return t || "—";
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function short(user: string): string {
  if (!user) return "—";
  if (user === "Administrator") return "Admin";
  return user.split("@")[0] || user;
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
