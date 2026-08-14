"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  FileCode,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Read-only view of the definitions catalog the analytics AI actually
 * uses when answering questions. Exposed under /analytics/semantics so
 * a data steward can:
 *   * Audit what the AI sees (does it match the definitions I edited?)
 *   * Force a refresh when they suspect something is stale
 *
 * Deliberately user-facing terminology throughout — no dev-side words
 * (compile, YAML, DocType, semantic file, etc.) leak into UI copy.
 * The technical text inside the file itself is what it is — that's
 * the audit target — but the wrapper chrome speaks business.
 *
 * Filesystem path is intentionally hidden: users don't need to know
 * where the file lives, and exposing it was a "dev info leak" the
 * product owner flagged.
 */

type ApiPayload = {
  yaml: string;
  path: string | null;
  model_code: string;
};

type RegeneratePayload = {
  output_path: string;
  bytes: number;
  model?: unknown;
};

export function CompiledYamlPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenResult, setRegenResult] = useState<RegeneratePayload | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRegenResult(null);
    try {
      const res = await fetch("/api/analytics/semantics/compiled-yaml", {
        cache: "no-store",
      });
      const body = (await res.json()) as ApiPayload | { error?: string };
      if (!res.ok || "error" in body) {
        throw new Error(
          ("error" in body && body.error) || `HTTP ${res.status}`,
        );
      }
      setData(body as ApiPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the AI reference.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data) void load();
    if (!open) setCopied(false);
  }, [open, data, load]);

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    setRegenResult(null);
    try {
      const res = await fetch("/api/analytics/semantics/compiled-yaml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as RegeneratePayload | { error?: string };
      if (!res.ok || "error" in body) {
        throw new Error(
          ("error" in body && body.error) || `HTTP ${res.status}`,
        );
      }
      setRegenResult(body as RegeneratePayload);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't refresh the AI reference.");
    } finally {
      setRegenerating(false);
    }
  };

  const copy = async () => {
    if (!data?.yaml) return;
    try {
      await navigator.clipboard.writeText(data.yaml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — degrade silently, the user can select the text.
    }
  };

  const meta = parseMeta(data?.yaml);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileCode className="h-3.5 w-3.5" />
          AI reference
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl">
        <SheetHeader className="border-b bg-muted/30 px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            What the AI sees
          </SheetTitle>
          <SheetDescription>
            The exact definitions the analytics AI uses when answering
            questions in Ask (AI). Read-only — to change a definition,
            edit its metric on the Metrics &amp; Overrides tab. Changes
            appear here automatically after you save.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 border-b bg-muted/10 px-6 py-3">
          <div className="min-w-0 flex-1">
            {meta && (
              <p className="text-xs text-muted-foreground">
                {meta.metric_count !== undefined && (
                  <>
                    <span className="font-medium text-foreground">
                      {meta.metric_count}
                    </span>{" "}
                    metrics ·{" "}
                    <span className="font-medium text-foreground">
                      {meta.dimension_count}
                    </span>{" "}
                    dimensions
                  </>
                )}
                {meta.compiled_at && (
                  <> · last updated {formatTimestamp(meta.compiled_at)}</>
                )}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              disabled={!data?.yaml || loading}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Reload
            </Button>
            <Button
              size="sm"
              onClick={regenerate}
              disabled={regenerating || !data?.path}
              className="gap-1.5"
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Force refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {regenResult && (
          <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-6 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            ✓ AI reference refreshed. The chat now uses the latest definitions.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 border-b border-rose-500/20 bg-rose-500/5 px-6 py-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {loading && !data ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : data?.yaml ? (
            <pre className="h-full overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-6 font-mono text-[11px] leading-relaxed text-slate-200">
              {data.yaml}
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nothing to show yet.
            </div>
          )}
        </div>

        <div className="border-t bg-muted/20 px-6 py-3 text-[11px] text-muted-foreground">
          The AI reference refreshes automatically whenever you save a
          metric, dimension, formula, or data source. Use{" "}
          <span className="font-medium">Force refresh</span> only if you
          need to confirm the AI has the very latest state right now.
        </div>
      </SheetContent>
    </Sheet>
  );
}

type MetaBlock = {
  compiled_at?: string;
  model_code?: string;
  metric_count?: number;
  dimension_count?: number;
};

/**
 * Extract the top-level ``_meta:`` block from the definitions file
 * without pulling in a real YAML parser. The block is deterministically
 * emitted first (backend uses ``sort_keys=False``), so a simple
 * line-oriented scan is enough.
 */
function parseMeta(yaml: string | undefined | null): MetaBlock | null {
  if (!yaml) return null;
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => l.trim() === "_meta:");
  if (start === -1) return null;
  const out: MetaBlock = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 && !line.startsWith(" ")) break;
    const m = /^\s{2}(\w+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.replace(/^['"]|['"]$/g, "").trim();
    if (key === "compiled_at") out.compiled_at = value;
    if (key === "model_code") out.model_code = value;
    if (key === "metric_count") out.metric_count = Number(value);
    if (key === "dimension_count") out.dimension_count = Number(value);
  }
  return out;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const delta = Math.max(0, now - d.getTime());
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} min ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} hr ago`;
  return d.toLocaleString();
}
