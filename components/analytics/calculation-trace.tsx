"use client";

import { useState } from "react";
import { ChevronDown, Sigma } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Provenance } from "./types";

/**
 * "How this was calculated" — a collapsible panel under every
 * analytics answer showing the metric definition, filters that were
 * applied, and the exact SQL + params that ran. The house rule is
 * that every calculation must be inspectable, so this component is
 * always mounted (never conditionally hidden by a prop) when
 * provenance exists.
 *
 * Deliberately keeps the SQL as monospaced pre-wrap so a curious
 * executive can screenshot or copy it to send to engineering.
 */
export function CalculationTrace({ provenance }: { provenance: Provenance }) {
  const [open, setOpen] = useState(false);
  const m = provenance.metric;

  return (
    <div className="rounded-xl border border-input bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
        aria-expanded={open}
      >
        <Sigma className="h-3.5 w-3.5 text-primary" />
        <span>How this was calculated</span>
        <span className="ml-auto text-[10px] font-normal text-muted-foreground">
          {open ? "Hide details" : "Show SQL, metric definition, filters"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t px-4 py-3 text-xs text-foreground">
          <Section title="Metric definition">
            <dl className="grid grid-cols-1 gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-4">
              <Row k="Name" v={m.name} />
              <Row k="Code" v={<code className="font-mono text-[11px]">{m.code}</code>} />
              {m.description && <Row k="Description" v={m.description} />}
              {m.computation_type && <Row k="Computation" v={humanComputation(m.computation_type)} />}
              {m.source_doctype && <Row k="Source" v={m.source_doctype} />}
              {m.aggregation && (
                <Row
                  k="Aggregation"
                  v={
                    m.aggregation_field
                      ? `${m.aggregation.toUpperCase()}(${m.aggregation_field})`
                      : m.aggregation.toUpperCase()
                  }
                />
              )}
              {m.formula && <Row k="Formula" v={<code className="font-mono text-[11px]">{m.formula}</code>} />}
              {m.unit && <Row k="Unit" v={m.unit} />}
              {formatBaseFilters(m.base_filters) && (
                <Row k="Baseline filters" v={<code className="font-mono text-[11px]">{formatBaseFilters(m.base_filters)}</code>} />
              )}
            </dl>
          </Section>

          {m.custom_sql && (
            <Section title="SQL template">
              <SqlBlock>{m.custom_sql}</SqlBlock>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Placeholders like <code className="font-mono">{"{{filters}}"}</code>,
                {" "}<code className="font-mono">{"{{joins}}"}</code>,
                {" "}<code className="font-mono">{"{{period_scope}}"}</code>{" "}
                are expanded by the query builder based on your question and tenant scope.
              </p>
            </Section>
          )}

          <Section title="Compiled SQL that ran">
            <SqlBlock>{provenance.sql}</SqlBlock>
          </Section>

          {Object.keys(provenance.params).length > 0 && (
            <Section title="Bound parameters">
              <dl className="grid grid-cols-1 gap-1 sm:grid-cols-[max-content_1fr] sm:gap-x-4">
                {Object.entries(provenance.params).map(([k, v]) => (
                  <Row
                    key={k}
                    k={<code className="font-mono text-[11px]">%({k})s</code>}
                    v={<code className="font-mono text-[11px]">{v}</code>}
                  />
                ))}
              </dl>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11px] font-medium text-muted-foreground sm:text-right">{k}</dt>
      <dd className="text-[11px] text-foreground">{v}</dd>
    </>
  );
}

function SqlBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-background/80 p-3 text-[11px] leading-relaxed">
      <code className="font-mono whitespace-pre-wrap break-words">{children}</code>
    </pre>
  );
}

function humanComputation(t: string): string {
  switch (t) {
    case "simple":
      return "Simple aggregation (SQL auto-generated from source doctype + aggregation)";
    case "computed":
      return "Computed (formula over other metrics)";
    case "sql":
      return "Custom SQL template";
    default:
      return t;
  }
}

function formatBaseFilters(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}
