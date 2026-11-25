"use client";

import { useState } from "react";
import { Check, Loader2, PencilRuler, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { DefineMeasure } from "./types";

/**
 * Shown when the assistant hits a measure it doesn't know yet.
 *
 * Three shapes, decided by the backend:
 *  1. The user can define it AND the data supports it → show the AI's
 *     plain-English draft, let them rename it, and "Save & answer" (which
 *     saves the measure tenant-privately and re-asks the original
 *     question against the now-complete catalog).
 *  2. The user can define it but the data isn't there → say so plainly
 *     and point them at the full editor / data upload.
 *  3. The user can't define measures (not an editor) → tell them an
 *     admin can add it. No save path.
 */
export function DefineMeasureCard({
  define,
  onAsk,
}: {
  define: DefineMeasure;
  onAsk: (q: string) => void;
}) {
  const { phrase, restated_question, can_map, reason, draft, can_define } = define;

  const [title, setTitle] = useState(draft?.title || titleCase(phrase));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Case 3: viewer can't curate measures -------------------------------
  if (!can_define) {
    return (
      <Shell tone="muted">
        <p className="text-sm text-foreground">
          I don&apos;t have a measure for <Term>{phrase}</Term> yet.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Someone with permission to manage measures can add it, and then
          questions like this will be answered for everyone on your team.
        </p>
      </Shell>
    );
  }

  // --- Case 2: nothing in the data to compute it from ---------------------
  if (!can_map || !draft) {
    return (
      <Shell tone="warn">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm text-foreground">
              I can&apos;t work out <Term>{phrase}</Term> from your data.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton href="/analytics/semantics">Set it up by hand</LinkButton>
          <LinkButton href="/analytics/semantics" variant="ghost">
            Upload a dataset
          </LinkButton>
        </div>
      </Shell>
    );
  }

  // --- Case 1: AI draft ready for confirmation ----------------------------
  const save = async () => {
    const name = title.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/save-measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name,
          computation_type: draft.computation_type,
          description: draft.description,
          plain_explanation: draft.plain_explanation,
          source_doctype: draft.source_doctype,
          aggregation: draft.aggregation,
          aggregation_field: draft.aggregation_field,
          base_filters: draft.base_filters,
          custom_sql: draft.custom_sql,
          unit: draft.unit,
          format: draft.format,
          higher_is_better: draft.higher_is_better,
          domain: draft.suggested_domain,
          restated_question,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        restated_question?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error || `Couldn't save (HTTP ${res.status}).`);
        return;
      }
      setSaved(true);
      // Re-run the original question — the measure is live now.
      onAsk((body.restated_question || restated_question || "").trim());
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell tone="accent">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">
          Let&apos;s define <Term>{phrase}</Term>
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        This isn&apos;t one of your measures yet. Here&apos;s how I&apos;d work it
        out from your data — confirm it and I&apos;ll save it and answer.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Name
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving || saved}
            maxLength={140}
            className={cn(
              "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:opacity-60",
            )}
          />
        </label>

        {draft.plain_explanation && (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              How it&apos;s worked out
            </span>
            <p className="mt-0.5 text-sm text-foreground">{draft.plain_explanation}</p>
            {draft.unit && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Shown in {draft.unit}.
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving || saved || !title.trim()}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Saved
            </>
          ) : (
            "Save & answer"
          )}
        </Button>
        <LinkButton href="/analytics/semantics" variant="ghost">
          <PencilRuler className="mr-1.5 h-3.5 w-3.5" />
          Adjust the details
        </LinkButton>
      </div>
    </Shell>
  );
}

// ── bits ────────────────────────────────────────────────────────────

function Shell({
  tone,
  children,
}: {
  tone: "accent" | "warn" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "accent" && "border-primary/30 bg-primary/[0.04]",
        tone === "warn" && "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20",
        tone === "muted" && "border-dashed border-input bg-muted/30",
      )}
    >
      {children}
    </div>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-foreground">“{children}”</span>;
}

function titleCase(s: string): string {
  const t = (s || "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function LinkButton({
  href,
  children,
  variant = "outline",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "outline" | "ghost";
}) {
  return (
    <Button asChild size="sm" variant={variant} className="h-7 text-xs">
      <a href={href}>{children}</a>
    </Button>
  );
}
