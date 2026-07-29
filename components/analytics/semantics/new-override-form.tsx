"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { SemanticMetricDetail } from "./types";

/**
 * Inline form for authoring a Candidate Formula Version. Shown
 * expanded under the header when the user hits "New override".
 *
 * The form adapts its fields to `override_kind`:
 *   Formula            → expression (code)
 *   Custom SQL         → custom_sql (code with {{...}} placeholders)
 *   Simple Aggregation → source_field / aggregation / aggregation_field
 *
 * On submit it POSTs to /api/analytics/semantics/formula-version.
 * A successful submit calls onCreated() so the parent detail view
 * refetches — the new Candidate then shows up in Version History
 * with an ACTIVE badge (since Candidates are visible to their
 * author immediately per arch §13.4).
 */

type OverrideKind = "Formula" | "Custom SQL" | "Simple Aggregation";

const AGG_CHOICES = [
  "count",
  "count_distinct",
  "sum",
  "avg",
  "min",
  "max",
] as const;

export function NewOverrideForm({
  detail,
  onClose,
  onCreated,
}: {
  detail: SemanticMetricDetail;
  onClose: () => void;
  onCreated: () => void;
}) {
  // Seed the form with the canonical body so authors edit-in-place
  // rather than typing a template from scratch.
  const canonical = detail.canonical;
  const defaultKind: OverrideKind =
    canonical.custom_sql
      ? "Custom SQL"
      : canonical.formula
      ? "Formula"
      : "Simple Aggregation";

  const [kind, setKind] = useState<OverrideKind>(defaultKind);
  const [expression, setExpression] = useState(canonical.formula || "");
  const [customSql, setCustomSql] = useState(canonical.custom_sql || "");
  const [sourceField, setSourceField] = useState<string>("");
  const [aggregation, setAggregation] = useState<string>(canonical.aggregation || "");
  const [aggregationField, setAggregationField] = useState<string>(
    canonical.aggregation_field || "",
  );
  const [changeReason, setChangeReason] = useState("");
  const [hasAssumptions, setHasAssumptions] = useState(false);
  const [assumptionNotes, setAssumptionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      setError("Change reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/formula-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: detail.code,
          override_kind: kind,
          change_reason: changeReason,
          expression: kind === "Formula" ? expression : "",
          custom_sql: kind === "Custom SQL" ? customSql : "",
          source_field: kind === "Simple Aggregation" ? sourceField : "",
          aggregation: kind === "Simple Aggregation" ? aggregation : "",
          aggregation_field: kind === "Simple Aggregation" ? aggregationField : "",
          has_assumptions: hasAssumptions,
          assumption_notes: assumptionNotes,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Author a new override
        </p>
        <Button type="button" size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Override kind selector */}
        <div>
          <FieldLabel>Override kind</FieldLabel>
          <div className="mt-1 flex gap-1.5">
            {(["Formula", "Custom SQL", "Simple Aggregation"] as OverrideKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  kind === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Kind-specific fields */}
        {kind === "Formula" && (
          <div>
            <FieldLabel>Formula expression</FieldLabel>
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. hr.comp.gross_pay - hr.comp.deductions"
              rows={2}
              className={textareaClass}
            />
            <FieldHint>References other metric codes; the executor expands them recursively.</FieldHint>
          </div>
        )}

        {kind === "Custom SQL" && (
          <div>
            <FieldLabel>Custom SQL template</FieldLabel>
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={7}
              className={cn(textareaClass, "font-mono text-[11px]")}
            />
            <FieldHint>
              Use{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{filters}}"}</code>
              ,{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{joins}}"}</code>
              ,{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{group_by}}"}</code>
              ,{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{dim_select}}"}</code>
              ,{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{period_scope}}"}</code>
              , or{" "}
              <code className="rounded bg-muted px-1 font-mono">{"{{tenant_scope}}"}</code>{" "}
              placeholders — the query builder expands them per your question and tenant scope.
            </FieldHint>
          </div>
        )}

        {kind === "Simple Aggregation" && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Source field</FieldLabel>
              <input
                value={sourceField}
                onChange={(e) => setSourceField(e.target.value)}
                placeholder="e.g. gross_usd"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Aggregation</FieldLabel>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {AGG_CHOICES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Aggregation field</FieldLabel>
              <input
                value={aggregationField}
                onChange={(e) => setAggregationField(e.target.value)}
                placeholder="usually same as source"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Change reason (required) */}
        <div>
          <FieldLabel required>Change reason</FieldLabel>
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="e.g. We count contractors in headcount because ..."
            rows={2}
            className={textareaClass}
          />
          <FieldHint>
            Required — reviewers see this and it becomes part of the audit trail.
          </FieldHint>
        </div>

        {/* Assumptions */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={hasAssumptions}
              onChange={(e) => setHasAssumptions(e.target.checked)}
              className="rounded border-input"
            />
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            This override uses assumed / approximated components
          </label>
          {hasAssumptions && (
            <textarea
              value={assumptionNotes}
              onChange={(e) => setAssumptionNotes(e.target.value)}
              placeholder="Plain-language note shown inline with every answer using this version."
              rows={2}
              className={cn(textareaClass, "mt-1")}
            />
          )}
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Saves as <span className="font-semibold text-blue-700 dark:text-blue-300">Candidate</span> — visible to you immediately in Ask.
            Move it to Under Review, then Published, from Version History.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save Candidate"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// --- style tokens -----------------------------------------------------

const inputClass =
  "mt-0.5 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const textareaClass = cn(inputClass, "resize-y font-normal");

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[10px] text-muted-foreground">{children}</p>;
}
