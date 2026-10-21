"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import type { BulkImportSummary } from "@/lib/frappe/bulk-import";

/**
 * Minimal CSV bulk-import UI: pick a .csv file (or paste text), hit
 * Import, read back a per-row success/failure summary. The caller
 * supplies the server action that actually inserts and the header row
 * for the "Download template" button.
 */
export function CsvImportForm({
  entityLabel,
  templateHeader,
  sampleRows,
  importAction,
}: {
  entityLabel: string;
  templateHeader: string[];
  sampleRows?: string[][];
  importAction: (csvText: string) => Promise<BulkImportSummary>;
}) {
  const [csvText, setCsvText] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function onImport() {
    setError(null);
    setSummary(null);
    if (!csvText.trim()) {
      setError("Pick a CSV file or paste rows first.");
      return;
    }
    setBusy(true);
    try {
      const res = await importAction(csvText);
      setSummary(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const lines = [templateHeader.join(",")];
    if (sampleRows) for (const r of sampleRows) lines.push(r.map(csvCell).join(","));
    const csv = lines.join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entityLabel.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:border-primary/40"
        >
          <Download className="h-3.5 w-3.5" />
          Download template
        </button>
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium hover:border-primary/40">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Pick CSV file
          <input type="file" accept=".csv" className="hidden" onChange={onFile} />
        </label>
      </div>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={`Paste CSV content here, or pick a file above. First row must match the template header: ${templateHeader.join(", ")}`}
        rows={10}
        className="w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-[12px] focus-ring"
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onImport}
          disabled={busy || !csvText.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Importing…" : `Import ${entityLabel}`}
        </button>
      </div>

      {summary && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-foreground">Imported {summary.inserted}</span>
            <span className="text-muted-foreground">
              {summary.failed} failed
            </span>
          </div>
          {summary.errors.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Rows with issues
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
                {summary.errors.slice(0, 50).map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-10 shrink-0 text-right font-mono text-muted-foreground">
                      {e.row}
                    </span>
                    <span className="text-destructive">{e.message}</span>
                  </li>
                ))}
                {summary.errors.length > 50 && (
                  <li className="pl-12 text-muted-foreground">… and {summary.errors.length - 50} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
