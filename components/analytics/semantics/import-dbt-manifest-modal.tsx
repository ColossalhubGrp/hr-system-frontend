"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileJson,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { uploadFileChunked, type UploadedFile } from "./frappe-upload";
import type {
  DbtImportResponse,
  DbtMetricPreview,
  DbtPreviewResponse,
  ExternalSourceRow,
  ExternalSourcesResponse,
} from "./types";

/**
 * Three-step wizard for importing a dbt manifest:
 *
 *   1. Upload — pick a manifest.json, chunked upload via Frappe's
 *      upload_file handler (same transport CSV uses), then
 *      immediately call the preview endpoint so step 2 has data
 *      to render.
 *
 *   2. Review — show project meta + counts, list every metric with
 *      supported/unsupported badge + description, checkbox per row
 *      so the Steward picks a subset. Pick a target Data Source
 *      (the warehouse dbt materialized into) from a dropdown of
 *      existing external connectors.
 *
 *   3. Import — send the selection to the backend, show what got
 *      created + what was skipped, close on Done. Parent's dataset
 *      list refreshes so the new imports show up straight away.
 */

type Step = "upload" | "review" | "done";

export function ImportDbtManifestModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (result: DbtImportResponse) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [staged, setStaged] = useState<UploadedFile | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<DbtPreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dataSources, setDataSources] = useState<ExternalSourceRow[]>([]);
  const [dataSourceCode, setDataSourceCode] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<DbtImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when the modal closes so re-opens don't leak state
  // (esp. the uploaded file_url — a previous import shouldn't
  // ghost-appear when the user reopens the flow).
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setUploading(false);
      setUploadPct(0);
      setStaged(null);
      setPreviewing(false);
      setPreview(null);
      setSelected(new Set());
      setDataSourceCode("");
      setImporting(false);
      setResult(null);
      setError(null);
    }
  }, [open]);

  // Pre-fetch the list of external data sources so the review step
  // can render a dropdown immediately without an extra roundtrip.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/analytics/semantics/data-sources", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as ExternalSourcesResponse;
        setDataSources(payload.sources || []);
        // Preselect the first source so the Steward doesn't have to
        // scroll — most tenants have only one warehouse anyway.
        if (payload.sources?.length && !dataSourceCode) {
          setDataSourceCode(payload.sources[0].code);
        }
      } catch {
        // Non-fatal — the dropdown just stays empty and the Import
        // button is disabled until they add a source.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const supportedMetricIds = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set(preview.metrics.filter((m) => m.supported).map((m) => m.unique_id));
  }, [preview]);

  // Once a preview lands, seed the selection with every supported
  // metric — the common case is "import all of them", and toggling
  // individual metrics off is cheaper than checking each one on.
  useEffect(() => {
    if (preview) setSelected(new Set(supportedMetricIds));
  }, [preview, supportedMetricIds]);

  const onFileChosen = async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadPct(0);
    try {
      const uploaded = await uploadFileChunked(file, (up, total) => {
        setUploadPct(Math.round((up / total) * 100));
      });
      setStaged(uploaded);
      await doPreview(uploaded.file_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const doPreview = async (file_url: string) => {
    setPreviewing(true);
    try {
      const res = await fetch("/api/analytics/semantics/dbt/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url }),
      });
      const body = (await res.json().catch(() => null)) as
        | (DbtPreviewResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      setPreview(body);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setPreviewing(false);
    }
  };

  const doImport = async () => {
    if (!staged || !dataSourceCode) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/dbt/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: staged.file_url,
          data_source_code: dataSourceCode,
          selected_metrics: JSON.stringify(Array.from(selected)),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (DbtImportResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      setResult(body);
      setStep("done");
      // Fire the parent's onImported callback but keep the modal
      // open on the result step so the Steward can see what got
      // created/skipped. They dismiss to close.
      onImported(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const toggleMetric = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAllSupported = () => setSelected(new Set(supportedMetricIds));
  const clearSelection = () => setSelected(new Set());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileJson className="h-4 w-4" />
            {step === "upload" && "Import dbt manifest"}
            {step === "review" && `Review dbt project${preview ? ` — ${preview.project_name}` : ""}`}
            {step === "done" && "Import complete"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <UploadStep
            uploading={uploading || previewing}
            uploadPct={uploadPct}
            previewing={previewing}
            error={error}
            onPicked={onFileChosen}
            onCancel={onClose}
          />
        )}

        {step === "review" && preview && (
          <ReviewStep
            preview={preview}
            selected={selected}
            supportedCount={supportedMetricIds.size}
            dataSources={dataSources}
            dataSourceCode={dataSourceCode}
            onDataSourceChange={setDataSourceCode}
            onToggle={toggleMetric}
            onSelectAllSupported={selectAllSupported}
            onClearSelection={clearSelection}
            importing={importing}
            error={error}
            onBack={() => { setStep("upload"); setStaged(null); setPreview(null); }}
            onCancel={onClose}
            onImport={doImport}
          />
        )}

        {step === "done" && result && (
          <DoneStep result={result} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Upload step ──────────────────────────────────────────────────

function UploadStep({
  uploading,
  uploadPct,
  previewing,
  error,
  onPicked,
  onCancel,
}: {
  uploading: boolean;
  uploadPct: number;
  previewing: boolean;
  error: string | null;
  onPicked: (file: File) => void;
  onCancel: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
      <p className="text-xs text-muted-foreground">
        Upload the <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">target/manifest.json</code> from a compiled
        dbt project. We&apos;ll parse it, show you what&apos;s importable
        (models + supported metrics), and let you pick which
        Data Source they materialized into before creating anything.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onPicked(f);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-input bg-card hover:border-primary/40 hover:bg-muted/30",
        )}
      >
        <input
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPicked(f);
          }}
          disabled={uploading}
        />
        {uploading || previewing ? (
          <>
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {previewing ? "Parsing manifest…" : `Uploading… ${uploadPct}%`}
            </p>
            {!previewing && (
              <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${uploadPct}%` }} />
              </div>
            )}
          </>
        ) : (
          <>
            <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drop your <code className="font-mono text-[11px]">manifest.json</code> here or click to browse
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              dbt 1.6+ semantic-layer format. Legacy pre-1.6 metrics are recognized but skipped with a warning.
            </p>
          </>
        )}
      </label>

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={uploading || previewing}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Review step ──────────────────────────────────────────────────

function ReviewStep({
  preview,
  selected,
  supportedCount,
  dataSources,
  dataSourceCode,
  onDataSourceChange,
  onToggle,
  onSelectAllSupported,
  onClearSelection,
  importing,
  error,
  onBack,
  onCancel,
  onImport,
}: {
  preview: DbtPreviewResponse;
  selected: Set<string>;
  supportedCount: number;
  dataSources: ExternalSourceRow[];
  dataSourceCode: string;
  onDataSourceChange: (code: string) => void;
  onToggle: (uid: string) => void;
  onSelectAllSupported: () => void;
  onClearSelection: () => void;
  importing: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  const targetSource = dataSources.find((s) => s.code === dataSourceCode);
  const adapterCompatible =
    !targetSource ||
    !preview.adapter_type ||
    isAdapterCompatible(preview.adapter_type, targetSource.source_type);
  const canImport = dataSourceCode.length > 0 && selected.size > 0 && adapterCompatible;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
      {/* Project meta */}
      <div className="grid gap-1 rounded-md border bg-muted/20 px-3 py-2 text-[11px] sm:grid-cols-4">
        <MetaCell k="Project" v={preview.project_name || "—"} mono />
        <MetaCell k="dbt version" v={preview.dbt_version || "—"} />
        <MetaCell k="Adapter" v={preview.adapter_type || "—"} />
        <MetaCell k="Generated" v={preview.generated_at?.split("T")[0] || "—"} />
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <Stat label="Models" value={preview.counts.models} />
        <Stat label="Metrics" value={preview.counts.metrics} />
        <Stat label="Supported" value={preview.counts.supported_metrics} />
        <Stat label="Semantic models" value={preview.counts.semantic_models} />
      </div>

      {/* Target Data Source */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-foreground">
          Target Data Source <span className="text-rose-600">*</span>
        </label>
        {dataSources.length === 0 ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            No external Data Sources configured. Connect the warehouse
            dbt materialized into (Postgres / BigQuery / Snowflake /
            Redshift) first, then re-open this import.
          </p>
        ) : (
          <select
            value={dataSourceCode}
            onChange={(e) => onDataSourceChange(e.target.value)}
            disabled={importing}
            className="block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          >
            {dataSources.map((s) => (
              <option key={s.code} value={s.code}>
                {s.title} — {s.source_type} ({s.code})
                {isAdapterCompatible(preview.adapter_type, s.source_type) ? "" : "  ⚠"}
              </option>
            ))}
          </select>
        )}
        {(() => {
          const target = dataSources.find((s) => s.code === dataSourceCode);
          if (!target || !preview.adapter_type) return null;
          if (isAdapterCompatible(preview.adapter_type, target.source_type)) return null;
          // Hard mismatch — dbt says the models are on a different
          // dialect than the target. Almost always a wrong pick.
          return (
            <p className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              This dbt project targets{" "}
              <code className="font-mono">{preview.adapter_type}</code>,
              but the selected Data Source is{" "}
              <code className="font-mono">{target.source_type}</code>.
              The manifest&apos;s models reference tables in
              <code className="ml-1 font-mono">
                {preview.models[0]?.qualified_name || "database.schema.table"}
              </code>
              {" "}form — that path won&apos;t exist on a different backend.
              Pick a matching Data Source before importing.
            </p>
          );
        })()}
        <p className="mt-1 text-[10px] text-muted-foreground">
          Metrics will run through this connector at query time. dbt is
          metadata — it doesn&apos;t execute queries itself.
        </p>
      </div>

      {/* Metrics list */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Metrics ({selected.size} of {supportedCount} selected)
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onSelectAllSupported} disabled={importing}>
              Select all supported
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={onClearSelection} disabled={importing}>
              Clear
            </Button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-md border bg-card">
          <ul className="divide-y">
            {preview.metrics.length === 0 && (
              <li className="px-3 py-3 text-center text-xs italic text-muted-foreground">
                No metrics found in this manifest.
              </li>
            )}
            {preview.metrics.map((m) => (
              <MetricRow
                key={m.unique_id}
                metric={m}
                checked={selected.has(m.unique_id)}
                onToggle={() => onToggle(m.unique_id)}
                disabled={importing || !m.supported}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <details className="rounded-md border border-amber-500/40 bg-amber-500/5">
          <summary className="cursor-pointer px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
            {preview.warnings_truncated ? " (first 50 shown)" : ""}
          </summary>
          <ul className="border-t border-amber-500/30 px-3 py-2 text-[10px] font-mono text-amber-900 dark:text-amber-200">
            {preview.warnings.map((w, i) => (
              <li key={i} className="mb-0.5 break-words">{w}</li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onImport}
          disabled={!canImport || importing}
          title={
            !adapterCompatible
              ? `dbt adapter ${preview.adapter_type} doesn't match this Data Source — pick a compatible one.`
              : !canImport
                ? "Pick a Data Source and at least one supported metric."
                : ""
          }
        >
          {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Import {selected.size} metric{selected.size === 1 ? "" : "s"} <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Done step ────────────────────────────────────────────────────

function DoneStep({
  result,
  onClose,
}: {
  result: DbtImportResponse;
  onClose: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <Check className="h-4 w-4" /> Import complete
        </p>
        <p className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
          {result.metrics_created.length} metric{result.metrics_created.length === 1 ? "" : "s"} created
          {" · "}
          {result.datasets_created.length} dataset{result.datasets_created.length === 1 ? "" : "s"} touched
          {" · "}
          {result.metrics_skipped.length} skipped
        </p>
      </div>

      {result.metrics_created.length > 0 && (
        <ResultBlock title="Metrics created" items={result.metrics_created} tone="ok" />
      )}
      {result.datasets_created.length > 0 && (
        <ResultBlock title="Datasets touched" items={result.datasets_created} tone="ok" />
      )}
      {result.metrics_skipped.length > 0 && (
        <details className="rounded-md border border-muted">
          <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
            {result.metrics_skipped.length} metric{result.metrics_skipped.length === 1 ? "" : "s"} skipped — click to see why
          </summary>
          <ul className="border-t px-3 py-2 text-[10px]">
            {result.metrics_skipped.map((s, i) => (
              <li key={i} className="mb-1">
                <code className="font-mono text-[10px] text-foreground">{s.unique_id}</code>{" "}
                — <span className="text-muted-foreground">{s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button size="sm" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ── Adapter-compat ───────────────────────────────────────────────

/**
 * Map dbt adapter_type → the set of Data Source source_types that
 * can actually execute that adapter's SQL. Kept generous: sqlglot
 * transpiles most flavors reasonably well, so redshift↔postgres and
 * mariadb↔mysql are treated as fungible. Truly divergent pairs
 * (postgres → bigquery) trigger the warning.
 */
const ADAPTER_COMPAT: Record<string, string[]> = {
  postgres:  ["postgres", "redshift"],
  redshift:  ["redshift", "postgres"],
  mysql:     ["mysql"],
  mariadb:   ["mysql"],
  bigquery:  ["bigquery"],
  snowflake: ["snowflake"],
  sqlserver: ["sqlserver"],
  mssql:     ["sqlserver"],
};

function isAdapterCompatible(dbtAdapter: string, sourceType: string): boolean {
  const key = (dbtAdapter || "").toLowerCase().trim();
  if (!key) return true;          // unknown adapter — don't warn
  const allowed = ADAPTER_COMPAT[key];
  if (!allowed) return true;      // adapter we don't recognize — don't warn
  return allowed.includes(sourceType);
}

// ── Bits ─────────────────────────────────────────────────────────

function MetricRow({
  metric,
  checked,
  onToggle,
  disabled,
}: {
  metric: DbtMetricPreview;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <li className={cn("flex items-start gap-2 px-3 py-2 text-xs", !metric.supported && "opacity-60")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{metric.label || metric.name}</p>
          <TypeBadge type={metric.type} supported={metric.supported} />
        </div>
        {metric.description && (
          <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
            {metric.description}
          </p>
        )}
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {metric.name}
          {metric.measure_agg && metric.measure_expr && (
            <> — <span className="text-foreground">{metric.measure_agg.toUpperCase()}({metric.measure_expr})</span></>
          )}
          {metric.model_qualified_name && (
            <> on <span className="text-foreground">{metric.model_qualified_name}</span></>
          )}
        </p>
      </div>
    </li>
  );
}

function TypeBadge({ type, supported }: { type: string; supported: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        supported
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-muted bg-muted/40 text-muted-foreground",
      )}
    >
      {type}{!supported && " · skipped"}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function MetaCell({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className={cn("truncate text-[11px] text-foreground", mono && "font-mono")}>{v}</p>
    </div>
  );
}

function ResultBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn";
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className={cn(
        "max-h-40 overflow-y-auto rounded-md border bg-card p-2 text-[10px]",
        tone === "warn" && "border-amber-500/30",
      )}>
        {items.map((it, i) => (
          <li key={i} className="mb-0.5 font-mono text-foreground">{it}</li>
        ))}
      </ul>
    </div>
  );
}
