"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Table as TableIcon,
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
  PdfImportPick,
  PdfImportResponse,
  PdfPreviewResponse,
  PdfTablePreview,
} from "./types";

/**
 * Three-step wizard matching the dbt-import shape:
 *
 *   1. Upload — drop a PDF, chunked upload, then auto-preview.
 *   2. Review — per-page collapsible sections with the tables
 *      pdfplumber detected. Each table shows row/col count + a
 *      sample-row preview + an editable title. Checkbox picks
 *      which to ingest. Header-row picker per table (default 0)
 *      so Stewards can skip a leading "banner" row if the PDF
 *      wraps the table with a title row.
 *   3. Done — per-table result: dataset code + row count on
 *      success, error text on failure.
 *
 * Each imported table becomes a CSV-shaped Dataset backed by a
 * MariaDB staging table — same downstream pipeline as CSV upload,
 * so the per-column quick-metric buttons and Ask (AI) work on
 * PDF-derived data identically.
 */

type Step = "upload" | "review" | "done";

interface TableFormState {
  selected: boolean;
  title: string;
  headerRowIndex: number;
}

export function ImportPdfModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (result: PdfImportResponse) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [staged, setStaged] = useState<UploadedFile | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PdfPreviewResponse | null>(null);
  // Keyed by `${page_index}::${table_index}` so lookups from the
  // per-table row stay O(1) and the checkbox state doesn't get
  // confused when a page has multiple tables.
  const [tableForms, setTableForms] = useState<Record<string, TableFormState>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<PdfImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setUploading(false);
      setUploadPct(0);
      setStaged(null);
      setPreviewing(false);
      setPreview(null);
      setTableForms({});
      setImporting(false);
      setResult(null);
      setError(null);
    }
  }, [open]);

  // Seed per-table form state (selected + suggested title +
  // default header row 0) as soon as preview lands.
  useEffect(() => {
    if (!preview) return;
    const seeded: Record<string, TableFormState> = {};
    preview.pages.forEach((p) =>
      p.tables.forEach((t) => {
        seeded[keyOf(t)] = {
          selected: true,
          title: t.suggested_title,
          headerRowIndex: 0,
        };
      }),
    );
    setTableForms(seeded);
  }, [preview]);

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
      const res = await fetch("/api/analytics/semantics/pdf/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url }),
      });
      const body = (await res.json().catch(() => null)) as
        | (PdfPreviewResponse & { error?: string })
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
    if (!staged || !preview) return;
    const selected: PdfImportPick[] = [];
    preview.pages.forEach((p) =>
      p.tables.forEach((t) => {
        const form = tableForms[keyOf(t)];
        if (form?.selected) {
          selected.push({
            page_index: t.page_index,
            table_index: t.table_index,
            title: form.title.trim() || t.suggested_title,
            header_row_index: form.headerRowIndex,
          });
        }
      }),
    );
    if (selected.length === 0) {
      setError("Pick at least one table to import.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/pdf/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: staged.file_url,
          selected: JSON.stringify(selected),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (PdfImportResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      setResult(body);
      setStep("done");
      onImported(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const updateForm = (k: string, patch: Partial<TableFormState>) => {
    setTableForms((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
  };

  const selectedCount = Object.values(tableForms).filter((f) => f.selected).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {step === "upload" && "Import tables from PDF"}
            {step === "review" && `Review — ${preview?.total_tables ?? 0} table${preview?.total_tables === 1 ? "" : "s"} in ${preview?.total_pages ?? 0} page${preview?.total_pages === 1 ? "" : "s"}`}
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
            tableForms={tableForms}
            selectedCount={selectedCount}
            updateForm={updateForm}
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

function keyOf(t: PdfTablePreview): string {
  return `${t.page_index}::${t.table_index}`;
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
        Upload a PDF containing tables (bank statement, financial
        report, government form, etc.). We&apos;ll detect tables per
        page and let you pick which to ingest. Text-based PDFs work
        best — scanned image PDFs need OCR which isn&apos;t yet
        supported.
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
          accept=".pdf,application/pdf"
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
              {previewing ? "Detecting tables…" : `Uploading… ${uploadPct}%`}
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
              Drop a <code className="font-mono text-[11px]">.pdf</code> here or click to browse
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              pdfplumber detects tables from line geometry — bordered
              tables extract most reliably.
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
  tableForms,
  selectedCount,
  updateForm,
  importing,
  error,
  onBack,
  onCancel,
  onImport,
}: {
  preview: PdfPreviewResponse;
  tableForms: Record<string, TableFormState>;
  selectedCount: number;
  updateForm: (k: string, patch: Partial<TableFormState>) => void;
  importing: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
      {preview.total_tables === 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          No tables detected across {preview.total_pages} page
          {preview.total_pages === 1 ? "" : "s"}. Text-based PDFs
          work best; scanned image PDFs need OCR (not yet supported).
        </p>
      )}

      {preview.pages.map((page) => (
        <div key={page.page_number} className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Page {page.page_number} — {page.tables.length} table{page.tables.length === 1 ? "" : "s"}
          </p>
          {page.tables.map((t) => {
            const k = `${t.page_index}::${t.table_index}`;
            const form = tableForms[k];
            if (!form) return null;
            return (
              <TableCard
                key={k}
                table={t}
                form={form}
                onFormChange={(patch) => updateForm(k, patch)}
                disabled={importing}
              />
            );
          })}
        </div>
      ))}

      {preview.warnings.length > 0 && (
        <details className="rounded-md border border-amber-500/40 bg-amber-500/5">
          <summary className="cursor-pointer px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
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
          disabled={selectedCount === 0 || importing}
        >
          {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Import {selectedCount} table{selectedCount === 1 ? "" : "s"} <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TableCard({
  table,
  form,
  onFormChange,
  disabled,
}: {
  table: PdfTablePreview;
  form: TableFormState;
  onFormChange: (patch: Partial<TableFormState>) => void;
  disabled: boolean;
}) {
  return (
    <div className={cn(
      "rounded-md border bg-card p-3",
      form.selected ? "border-primary/40" : "border-input",
    )}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={form.selected}
          onChange={(e) => onFormChange({ selected: e.target.checked })}
          disabled={disabled}
          className="mt-1 h-3.5 w-3.5 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-1.5">
            <TableIcon className="h-3.5 w-3.5 text-primary" />
            <input
              value={form.title}
              onChange={(e) => onFormChange({ title: e.target.value })}
              disabled={disabled || !form.selected}
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              placeholder="Dataset title"
            />
            <span className="rounded-full border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {table.row_count}×{table.column_count}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <label className="flex items-center gap-1 text-muted-foreground">
              Header row:
              <select
                value={form.headerRowIndex}
                onChange={(e) => onFormChange({ headerRowIndex: Number(e.target.value) })}
                disabled={disabled || !form.selected}
                className="rounded border border-input bg-background px-1 py-0.5 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                {table.sample_rows.map((_, i) => (
                  <option key={i} value={i}>Row {i} (0-indexed)</option>
                ))}
              </select>
            </label>
          </div>
          <SampleTable rows={table.sample_rows} headerIndex={form.headerRowIndex} />
        </div>
      </div>
    </div>
  );
}

function SampleTable({ rows, headerIndex }: { rows: string[][]; headerIndex: number }) {
  if (rows.length === 0) return null;
  const header = rows[headerIndex] ?? [];
  const dataRows = rows.slice(headerIndex + 1);
  return (
    <div className="overflow-x-auto rounded border bg-muted/20">
      <table className="w-full min-w-max text-[10px]">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border-b border-input bg-muted/40 px-1.5 py-1 text-left font-semibold text-foreground"
              >
                {cell || <span className="italic text-muted-foreground">empty</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, i) => (
            <tr key={i} className="odd:bg-background even:bg-muted/10">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-muted/30 px-1.5 py-1 font-mono text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Done step ────────────────────────────────────────────────────

function DoneStep({
  result,
  onClose,
}: {
  result: PdfImportResponse;
  onClose: () => void;
}) {
  const okCount = result.created.length;
  const errCount = result.errors.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
      <div className={cn(
        "rounded-md border p-3",
        errCount === 0
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-amber-500/40 bg-amber-500/5",
      )}>
        <p className={cn(
          "flex items-center gap-1.5 text-sm font-semibold",
          errCount === 0 ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200",
        )}>
          {errCount === 0 ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          Import complete
        </p>
        <p className="mt-1 text-[11px] opacity-80">
          {okCount} dataset{okCount === 1 ? "" : "s"} created · {errCount} failed
        </p>
      </div>

      {result.created.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Datasets created
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-card p-2 text-[10px]">
            {result.created.map((c, i) => (
              <li key={i} className="flex items-center gap-2 font-mono">
                <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                <span className="text-foreground">{c.dataset_code}</span>
                <span className="text-muted-foreground">
                  ({c.row_count} rows × {c.column_count} cols · page {c.page_index + 1} table {c.table_index + 1})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.errors.length > 0 && (
        <details className="rounded-md border border-rose-500/30" open>
          <summary className="cursor-pointer px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            {result.errors.length} table{result.errors.length === 1 ? "" : "s"} failed
          </summary>
          <ul className="border-t border-rose-500/20 px-3 py-2 text-[10px]">
            {result.errors.map((e, i) => (
              <li key={i} className="mb-1">
                <span className="font-mono">
                  page {e.page_index + 1} table {e.table_index + 1}
                </span>
                {" — "}
                <span className="text-rose-700 dark:text-rose-300">{e.error}</span>
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
