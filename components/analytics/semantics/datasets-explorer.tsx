"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Sigma,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type {
  CreatedMetric,
  DatasetColumn,
  DatasetColumnsResponse,
  DatasetListResponse,
  DatasetRow,
  DataSourceType,
  IngestCsvResponse,
} from "./types";
import { uploadFileChunked, type UploadedFile } from "./frappe-upload";
import { ConnectExternalDbModal } from "./connect-external-db-modal";
import { ImportDbtManifestModal } from "./import-dbt-manifest-modal";
import { ImportPdfModal } from "./import-pdf-modal";

/**
 * The "Data" tab: catalog of every registered Dataset + a dropzone
 * to upload new CSVs. Ingestion is a two-step flow so users see
 * progress + inferred types BEFORE anything commits:
 *
 *   1. Pick / drop a file  →  chunked upload to Frappe (progress bar).
 *   2. Confirm dialog       →  edit title + code, review inferred
 *                              types + sample rows, hit "Ingest".
 *   3. On success           →  new dataset appears in the list; the
 *                              catalog picks up its columns via the
 *                              backend's auto-profile pass.
 */

export function DatasetsExplorer() {
  const [data, setData] = useState<DatasetListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [staged, setStaged] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion / confirm
  const [ingesting, setIngesting] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    title: "",
    code: "",
    description: "",
  });
  const [ingestResult, setIngestResult] = useState<IngestCsvResponse | null>(null);

  // Phase 2.6a: Connect-external-database modal
  const [showConnectDb, setShowConnectDb] = useState(false);
  // Phase 2.8: Import-from-dbt-manifest modal
  const [showImportDbt, setShowImportDbt] = useState(false);
  // Phase 2.9: Import-tables-from-PDF modal
  const [showImportPdf, setShowImportPdf] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/datasets", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as DatasetListResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onFileChosen = async (file: File) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadPct(0);
    setStaged(null);
    setIngestResult(null);
    // Seed the confirm form with a reasonable default title / code
    // from the filename; the user can edit before ingesting.
    const stem = file.name.replace(/\.[^.]+$/, "");
    setIngestForm({
      title: stem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled dataset",
      code: stem.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "dataset",
      description: "",
    });
    try {
      const result = await uploadFileChunked(file, (up, total) => {
        setUploadPct(Math.round((up / total) * 100));
      });
      setStaged(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const doIngest = async () => {
    if (!staged) return;
    setIngesting(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: staged.file_url,
          title: ingestForm.title.trim(),
          code: ingestForm.code.trim() || undefined,
          description: ingestForm.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as IngestCsvResponse;
      setIngestResult(payload);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed.");
    } finally {
      setIngesting(false);
    }
  };

  const resetUploadFlow = () => {
    setStaged(null);
    setIngestResult(null);
    setUploadPct(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalDatasets = data?.datasets.length ?? 0;
  const bySource = data?.counts_by_source ?? {};

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-2">
      <Header
        totalDatasets={totalDatasets}
        bySource={bySource}
        onReload={load}
        loading={loading}
        editable={data?.editable ?? false}
        onConnectDb={() => setShowConnectDb(true)}
        onImportDbt={() => setShowImportDbt(true)}
        onImportPdf={() => setShowImportPdf(true)}
      />

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {data?.editable && !staged && !ingestResult && (
        <Dropzone
          uploading={uploading}
          uploadPct={uploadPct}
          onPicked={onFileChosen}
          inputRef={fileInputRef}
        />
      )}

      {/* Phase 2.6a: connect-external-database modal. Rendered here
          so it can trigger the same `load()` refresh the upload flow
          uses when a new Dataset lands. */}
      {data?.editable && (
        <ConnectExternalDbModal
          open={showConnectDb}
          onClose={() => setShowConnectDb(false)}
          onCreated={() => { load(); }}
        />
      )}

      {/* Phase 2.8: dbt manifest import modal. Same reload pattern —
          new Datasets + Metric Definitions land in the list and the
          semantic catalog on close. */}
      {data?.editable && (
        <ImportDbtManifestModal
          open={showImportDbt}
          onClose={() => setShowImportDbt(false)}
          onImported={() => { load(); }}
        />
      )}

      {/* Phase 2.9: PDF table extraction. Each imported table becomes
          a CSV-shaped Dataset via the same csv_ingestion path — so
          the Data-tab card list and per-column quick-metric buttons
          work identically to a direct CSV upload. */}
      {data?.editable && (
        <ImportPdfModal
          open={showImportPdf}
          onClose={() => setShowImportPdf(false)}
          onImported={() => { load(); }}
        />
      )}

      {staged && !ingestResult && (
        <ConfirmIngestCard
          uploadedName={staged.file_url.split("/").pop() || ""}
          form={ingestForm}
          onFormChange={(patch) => setIngestForm({ ...ingestForm, ...patch })}
          onCancel={resetUploadFlow}
          onIngest={doIngest}
          ingesting={ingesting}
        />
      )}

      {ingestResult && (
        <IngestResultCard result={ingestResult} onDismiss={resetUploadFlow} />
      )}

      <DatasetList
        datasets={data?.datasets ?? []}
        loading={loading}
        editable={data?.editable ?? false}
        onDeleted={load}
      />
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function Header({
  totalDatasets,
  bySource,
  onReload,
  loading,
  editable,
  onConnectDb,
  onImportDbt,
  onImportPdf,
}: {
  totalDatasets: number;
  bySource: Record<string, number>;
  onReload: () => void;
  loading: boolean;
  editable: boolean;
  onConnectDb: () => void;
  onImportDbt: () => void;
  onImportPdf: () => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Semantic layer / Data
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Datasets</h2>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          Tables the semantic layer can query. Native Frappe DocTypes plus
          any CSVs you upload here. Uploaded columns auto-profile into the
          Field Semantic Catalog so Ask (AI) can find them immediately.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{totalDatasets}</span> total
        </span>
        {Object.entries(bySource).map(([src, n]) => (
          <span
            key={src}
            className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
            title={`Data Source: ${src}`}
          >
            <code className="font-mono text-foreground">{src}</code>{" "}
            <span className="font-semibold text-foreground">{n}</span>
          </span>
        ))}
        {editable && (
          <Button size="sm" variant="outline" onClick={onConnectDb}>
            <Database className="mr-1.5 h-3.5 w-3.5" />
            Connect database
          </Button>
        )}
        {editable && (
          <Button size="sm" variant="outline" onClick={onImportDbt}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Import from dbt
          </Button>
        )}
        {editable && (
          <Button size="sm" variant="outline" onClick={onImportPdf}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Import from PDF
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onReload} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
        {!editable && (
          <span className="text-[11px] italic text-muted-foreground">read-only</span>
        )}
      </div>
    </header>
  );
}

// ── Dropzone ───────────────────────────────────────────────────────

function Dropzone({
  uploading,
  uploadPct,
  onPicked,
  inputRef,
}: {
  uploading: boolean;
  uploadPct: number;
  onPicked: (file: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const [dragging, setDragging] = useState(false);
  return (
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
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPicked(f);
        }}
        disabled={uploading}
      />
      {uploading ? (
        <>
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Uploading… {uploadPct}%</p>
          <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-150"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Chunked upload — safe to close the tab; Frappe re-assembles on the last chunk.
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Drop a CSV here or click to browse
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Chunked upload — files of any size, encoding auto-detected.
          </p>
        </>
      )}
    </label>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────

function ConfirmIngestCard({
  uploadedName,
  form,
  onFormChange,
  onCancel,
  onIngest,
  ingesting,
}: {
  uploadedName: string;
  form: { title: string; code: string; description: string };
  onFormChange: (patch: Partial<typeof form>) => void;
  onCancel: () => void;
  onIngest: () => void;
  ingesting: boolean;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Ready to ingest{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{uploadedName}</code>
          </p>
          <p className="text-[11px] text-muted-foreground">
            File is staged. Confirm the details below and we'll parse + type-infer +
            create a Dataset backed by a fresh MariaDB staging table.
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onCancel} disabled={ingesting} className="h-7 w-7">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" required>
          <input
            value={form.title}
            onChange={(e) => onFormChange({ title: e.target.value })}
            className={inputClass}
            disabled={ingesting}
          />
        </Field>
        <Field label="Code" hint="Stable identifier — lowercase snake_case. Auto-generated if blank.">
          <input
            value={form.code}
            onChange={(e) => onFormChange({ code: e.target.value })}
            className={cn(inputClass, "font-mono text-[11px]")}
            disabled={ingesting}
            placeholder="auto"
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(e) => onFormChange({ description: e.target.value })}
            rows={2}
            className={inputClass}
            disabled={ingesting}
            placeholder="Optional. Shown to Ask (AI) when the dataset is used."
          />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={ingesting}>
          Cancel
        </Button>
        <Button size="sm" onClick={onIngest} disabled={ingesting || !form.title.trim()}>
          {ingesting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Ingesting…
            </>
          ) : (
            <>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Ingest
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Result card ────────────────────────────────────────────────────

function IngestResultCard({
  result,
  onDismiss,
}: {
  result: IngestCsvResponse;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            <Check className="mr-1 inline h-4 w-4" />
            Ingested {result.row_count} rows into{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {result.dataset_code}
            </code>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Staging table: <code className="font-mono">{result.physical_table}</code>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss}>Upload another</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left">Original name</th>
              <th className="px-3 py-1.5 text-left">Safe name</th>
              <th className="px-3 py-1.5 text-left">Kind</th>
              <th className="px-3 py-1.5 text-left">SQL type</th>
              <th className="px-3 py-1.5 text-left">Sample</th>
            </tr>
          </thead>
          <tbody>
            {result.columns.map((c) => (
              <tr key={c.safe_name} className="border-t">
                <td className="px-3 py-1.5 text-foreground">{c.original_name}</td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {c.safe_name}
                </td>
                <td className="px-3 py-1.5"><KindPill kind={c.inferred_kind} /></td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {c.sql_type}
                </td>
                <td className="px-3 py-1.5 text-[10px] text-muted-foreground">
                  {(c.sample_values || []).slice(0, 3).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.warnings?.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <ul className="list-disc space-y-0.5 pl-4">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Ask (AI) can now find these columns. Quick metric shortcuts (Count / Sum /
        Average per column) ship in Phase 2.4c.
      </p>
    </div>
  );
}

// ── Existing datasets list ─────────────────────────────────────────

function DatasetList({
  datasets,
  loading,
  editable,
  onDeleted,
}: {
  datasets: DatasetRow[];
  loading: boolean;
  editable: boolean;
  onDeleted: () => void;
}) {
  const csvDatasets = useMemo(
    () => datasets.filter((d) => d.data_source === "csv_uploads"),
    [datasets],
  );
  const otherDatasets = useMemo(
    () => datasets.filter((d) => d.data_source !== "csv_uploads"),
    [datasets],
  );

  if (loading && datasets.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading datasets…
      </div>
    );
  }
  if (datasets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-input bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        No datasets yet. Upload a CSV above to get started.
      </div>
    );
  }
  return (
    <>
      {csvDatasets.length > 0 && (
        <Section title="Uploaded CSVs">
          {csvDatasets.map((d) => (
            <DatasetCard key={d.name} d={d} editable={editable} onDeleted={onDeleted} />
          ))}
        </Section>
      )}
      {otherDatasets.length > 0 && (
        <Section title="Other datasets">
          {otherDatasets.map((d) => (
            <DatasetCard key={d.name} d={d} editable={editable} onDeleted={onDeleted} />
          ))}
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DatasetCard({
  d,
  editable,
  onDeleted,
}: {
  d: DatasetRow;
  editable: boolean;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Only CSV-upload datasets are safe to delete via this UI —
  // dropping a Frappe DocType's table would break the app, and
  // external-DB tables aren't ours to drop. Fallback to legacy
  // data_source check for backwards compat with rows written
  // before source_type was joined into the list response.
  const canDelete =
    editable &&
    (d.source_type === "csv_upload" || d.data_source === "csv_uploads");

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/analytics/semantics/datasets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: d.code, drop_table: true }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setConfirmDelete(false);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-2 rounded-t-xl p-3 text-left hover:bg-muted/20"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <SourceIcon sourceType={d.source_type} />
            <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
            {d.source_type && d.source_type !== "csv_upload" && d.source_type !== "frappe_doctype" && (
              <span className="ml-1 rounded-full border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                {sourceLabel(d.source_type)}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate pl-5 font-mono text-[10px] text-muted-foreground">
            {d.code}
          </p>
        </div>
        {canDelete && !confirmDelete && (
          <span
            role="button"
            aria-label="Delete dataset"
            title="Delete dataset + drop staging table"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" />
          </span>
        )}
      </button>
      <div className="px-3 pb-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          <dt>Data source</dt>
          <dd className="font-mono text-foreground">{d.data_source}</dd>
          {d.source_table && (<><dt>Table</dt><dd className="truncate font-mono text-foreground">{d.source_table}</dd></>)}
          {d.row_count != null && (<><dt>Rows</dt><dd className="font-semibold text-foreground">{d.row_count.toLocaleString()}</dd></>)}
          {d.last_profiled_at && (<><dt>Profiled</dt><dd className="text-foreground">{d.last_profiled_at.split(" ")[0]}</dd></>)}
        </dl>
        {d.description && (
          <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
            {d.description}
          </p>
        )}
        {confirmDelete && (
          <div className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/5 p-2 text-[11px]">
            <p className="mb-2 text-rose-800 dark:text-rose-200">
              Delete this dataset AND drop its staging table? This can't be undone.
            </p>
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }} disabled={deleting} className="h-6 px-2 text-[10px]">
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); doDelete(); }}
                disabled={deleting}
                className="h-6 px-2 text-[10px] border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
              >
                {deleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
      {expanded && <DatasetColumnsPanel datasetCode={d.code} editable={editable} />}
    </div>
  );
}

// ── Expandable columns panel + quick-metric flow ───────────────────

function DatasetColumnsPanel({
  datasetCode,
  editable,
}: {
  datasetCode: string;
  editable: boolean;
}) {
  const [data, setData] = useState<DatasetColumnsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickTarget, setQuickTarget] = useState<{
    column: string;
    isNumeric: boolean;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/semantics/datasets/columns?code=${encodeURIComponent(datasetCode)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as DatasetColumnsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load columns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetCode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading columns…
      </div>
    );
  }
  if (error) {
    return (
      <div className="border-t border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="border-t bg-muted/10 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Columns
        </p>
        <p className="text-[10px] text-muted-foreground">
          {data.metrics.length} metric{data.metrics.length === 1 ? "" : "s"} exist on this dataset
        </p>
      </div>
      <ul className="space-y-1">
        {data.columns.map((col) => (
          <li
            key={col.name}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
              {col.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {col.sql_type}
            </span>
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() =>
                  setQuickTarget({ column: col.name, isNumeric: col.is_numeric })
                }
                title="Create metric from this column"
              >
                <Sigma className="mr-1 h-3 w-3" /> Metric
              </Button>
            )}
          </li>
        ))}
      </ul>
      {data.metrics.length > 0 && (
        <>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Existing metrics
          </p>
          <ul className="mt-1 space-y-0.5">
            {data.metrics.map((m) => (
              <li
                key={m.name}
                className="flex items-center gap-2 text-[11px] text-foreground"
              >
                <Sigma className="h-3 w-3 text-primary" />
                <span className="font-medium">{m.title}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {m.code}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {quickTarget && (
        <QuickMetricModal
          datasetCode={datasetCode}
          column={quickTarget.column}
          isNumeric={quickTarget.isNumeric}
          onClose={() => setQuickTarget(null)}
          onCreated={() => {
            setQuickTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function QuickMetricModal({
  datasetCode,
  column,
  isNumeric,
  onClose,
  onCreated,
}: {
  datasetCode: string;
  column: string;
  isNumeric: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  // COUNT is always offered (works on any column). SUM/AVG/MIN/MAX
  // only for numeric.
  const availableAggs = isNumeric ? ["COUNT", "SUM", "AVG", "MIN", "MAX"] : ["COUNT"];
  const [agg, setAgg] = useState<string>(availableAggs[0]);
  const [title, setTitle] = useState(defaultTitle(agg, column));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedMetric | null>(null);

  // Re-suggest the title when the user changes the aggregation
  // (only until they've typed their own — track a manual-touched flag).
  const [manualTitle, setManualTitle] = useState(false);
  const onAggChange = (newAgg: string) => {
    setAgg(newAgg);
    if (!manualTitle) setTitle(defaultTitle(newAgg, column));
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/datasets/create-metric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_code: datasetCode,
          column,
          aggregation: agg,
          title: title.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setResult((await res.json()) as CreatedMetric);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result ? "Metric created" : "Create a metric"}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/[0.05] p-3">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                <Check className="mr-1 inline h-3.5 w-3.5" />
                {result.title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {result.metric_code}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ask (AI) can now answer questions using this metric. Try asking
              something like{" "}
              <em className="text-foreground">
                &quot;{suggestedAskQuestion(result)}&quot;
              </em>
              . You don't need to name the dataset unless another
              metric measures the same concept.
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onCreated}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Column
              </p>
              <p className="mt-0.5 font-mono text-foreground">
                {datasetCode}.{column}
              </p>
              {!isNumeric && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Only COUNT is offered — this column isn't numeric.
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Aggregation
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableAggs.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onAggChange(a)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      agg === a
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:text-foreground",
                    )}
                    disabled={saving}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Title
              </p>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setManualTitle(true);
                }}
                className={inputClass}
                disabled={saving}
              />
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={saving || !title.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <Sigma className="mr-1.5 h-3.5 w-3.5" /> Create metric
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function defaultTitle(agg: string, column: string): string {
  const humanCol = column.replace(/_/g, " ");
  if (agg === "COUNT") return `Total rows (${humanCol})`;
  const map: Record<string, string> = {
    SUM: "Total",
    AVG: "Average",
    MIN: "Minimum",
    MAX: "Maximum",
  };
  return `${map[agg] || agg} ${humanCol}`;
}

function suggestedAskQuestion(result: CreatedMetric): string {
  // Natural-sounding question that doesn't lean on the dataset code.
  // The planner picks the metric from its catalog by concept — the
  // dataset name is only needed to disambiguate when multiple metrics
  // measure the same thing.
  const humanCol = result.column.replace(/_/g, " ");
  const agg = result.aggregation.toUpperCase();
  if (agg === "COUNT") return `how many ${humanCol}?`;
  const verb: Record<string, string> = {
    SUM: "total",
    AVG: "average",
    MIN: "smallest",
    MAX: "largest",
  };
  return `what's the ${verb[agg] || agg.toLowerCase()} ${humanCol}?`;
}

// ── Shared bits ────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </p>
      <div className="mt-0.5">{children}</div>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function KindPill({ kind }: { kind: string }) {
  const cls = {
    int: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    float: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    date: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    bool: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    text: "bg-muted text-foreground",
  }[kind] ?? "bg-muted text-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold", cls)}>
      {kind}
    </span>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60";

// ── Source-type visuals (Phase 2.6a) ──────────────────────────────

function SourceIcon({ sourceType }: { sourceType: DataSourceType | null }) {
  // CSV uploads keep their existing spreadsheet icon so nothing
  // visible changes for the pre-2.6a common case. Everything else
  // (Frappe DocType, Postgres, MySQL, warehouses) gets a generic
  // database icon — dialect-specific icons can come later if
  // Stewards find them useful.
  if (sourceType === "csv_upload") {
    return <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />;
  }
  return <Database className="h-3.5 w-3.5 text-muted-foreground" />;
}

function sourceLabel(sourceType: DataSourceType): string {
  return {
    postgres: "Postgres",
    mysql: "MySQL",
    sqlserver: "SQL Server",
    bigquery: "BigQuery",
    snowflake: "Snowflake",
    redshift: "Redshift",
    dbt_manifest: "dbt",
    frappe_doctype: "Frappe",
    csv_upload: "CSV",
  }[sourceType] ?? sourceType;
}
