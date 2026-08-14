"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
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
 * Read-only view of the compiled ``semantic.yaml`` that nao actually
 * reads at chat time, exposed under /analytics/semantics → Metrics &
 * Overrides so operators can:
 *   * verify what the LLM sees (auditability)
 *   * force a rebuild when a manual DocType edit didn't trigger the
 *     auto-recompile hook
 *   * confirm the on-disk file matches the DocType state
 *
 * The panel is a slide-out sheet — the YAML can be dense (16-24KB
 * of text), and a modal cramped it against the metric table below.
 * Sheet on the right gives it room without leaving the semantics
 * page.
 *
 * Regenerate button POSTs to the same endpoint which routes to
 * ``semantic_compiler.compile_and_write`` — Analytics Steward gated
 * on the Frappe side.
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
      setError(err instanceof Error ? err.message : "Failed to load compiled YAML.");
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
      // Reload so the panel shows the freshly-written bytes.
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Regenerate failed.",
      );
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
      // Clipboard blocked — degrade silently, user can select-all in
      // the pre.
    }
  };

  const meta = parseMeta(data?.yaml);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileCode className="h-3.5 w-3.5" />
          Compiled YAML
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl">

        <SheetHeader className="border-b bg-muted/30 px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Compiled semantic.yaml
          </SheetTitle>
          <SheetDescription>
            The exact bytes nao's chat runtime reads. Compiled from the
            Metric, Dimension, Formula Version and Business Context
            DocTypes above. Read-only — edits go through the metric
            forms and are recompiled automatically on save.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 border-b bg-muted/10 px-6 py-3">
          <div className="min-w-0 flex-1">
            {data?.path ? (
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium">On disk:</span>{" "}
                <code className="text-[11px]">{data.path}</code>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No ``nao_semantic_yaml_path`` set in site config.
              </p>
            )}
            {meta && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Model <code>{meta.model_code}</code>
                {meta.metric_count !== undefined && (
                  <>
                    {" "}· {meta.metric_count} metrics · {meta.dimension_count} dimensions
                  </>
                )}
                {meta.compiled_at && (
                  <> · compiled {formatTimestamp(meta.compiled_at)}</>
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
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate now
                </>
              )}
            </Button>
          </div>
        </div>

        {regenResult && (
          <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-6 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            ✓ Wrote {regenResult.bytes.toLocaleString()} bytes to{" "}
            <code>{regenResult.output_path}</code>
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
              Loading compiled YAML…
            </div>
          ) : data?.yaml ? (
            <pre className="h-full overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-6 font-mono text-[11px] leading-relaxed text-slate-200">
              {data.yaml}
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No YAML to display.
            </div>
          )}
        </div>

        <div className="border-t bg-muted/20 px-6 py-3 text-[11px] text-muted-foreground">
          <ExternalLink className="mr-1 inline h-3 w-3" />
          Auto-recompiled on every metric / dimension / formula-version /
          data-source save. Manual regenerate is only needed if the
          hook is disabled or an out-of-band DocType edit skipped it.
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
 * Extract the top-level ``_meta:`` block from the compiled YAML without
 * pulling in a real YAML parser. The block is deterministically
 * emitted first by the compiler (colossal_bi 1bdb8c9 uses
 * ``sort_keys=False``), so a simple line-oriented scan is enough.
 */
function parseMeta(yaml: string | undefined | null): MetaBlock | null {
  if (!yaml) return null;
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => l.trim() === "_meta:");
  if (start === -1) return null;
  const out: MetaBlock = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    // A non-indented line ends the _meta block.
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
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return d.toLocaleString();
}
