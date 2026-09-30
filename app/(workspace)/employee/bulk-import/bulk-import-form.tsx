"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  bulkImportEmployeesAction,
  downloadEmployeeTemplateAction,
  type ImportSummary,
} from "./actions";
import { TEMPLATE_COLUMNS } from "./actions";

export function BulkImportForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function pickFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Upload a .csv file. To use Excel: File → Save As → CSV.");
      return;
    }
    setFileName(f.name);
    setSummary(null);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Couldn't read the file.");
    reader.readAsText(f);
  }

  function submit() {
    if (!csvText.trim()) {
      toast.error("Choose a CSV file first.");
      return;
    }
    start(async () => {
      try {
        const res = await bulkImportEmployeesAction(csvText);
        setSummary(res);
        if (res.inserted > 0) {
          toast.success(`Imported ${res.inserted} employee${res.inserted === 1 ? "" : "s"}.`);
        } else if (res.total === 0) {
          toast.error("No rows found in the file.");
        } else {
          toast.error(`Nothing imported — ${res.failed} row${res.failed === 1 ? "" : "s"} failed. See details below.`);
        }
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Import failed.");
      }
    });
  }

  async function downloadTemplate() {
    try {
      const csv = await downloadEmployeeTemplateAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employee-bulk-hire-template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't build the template.");
    }
  }

  const rowCount = csvText
    ? Math.max(0, csvText.split(/\r?\n/).filter((l) => l.trim()).length - 1)
    : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link href={"/employee" as Route} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to employees
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Employees · Bulk hire
        </p>
        <h1 className="text-[28px] font-bold leading-tight text-foreground">
          Import employees from a spreadsheet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For onboarding a whole intake in one go. Fill the template, upload the CSV,
          and every valid row becomes an active employee record.
        </p>
      </header>

      {/* Step 1 — download template */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Step 1
            </div>
            <h2 className="text-base font-bold text-foreground">Download the template</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A CSV with all supported columns + one example row. Open it in Excel,
              fill each row (one employee per line), then save as CSV.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
          >
            <Download className="h-4 w-4" />
            Download CSV template
          </button>
        </div>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Column reference ({TEMPLATE_COLUMNS.length} columns — {TEMPLATE_COLUMNS.filter((c) => c.required).length} required)
          </summary>
          <div className="mt-2 overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Column</th>
                  <th className="px-3 py-1.5 text-left font-medium">Required?</th>
                  <th className="px-3 py-1.5 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_COLUMNS.map((c) => (
                  <tr key={c.key} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-[11px]">{c.label}</td>
                    <td className="px-3 py-1.5">{c.required ? <span className="text-rose-600">Required</span> : "Optional"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{c.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* Step 2 — upload */}
      <section className="rounded-xl border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Step 2
        </div>
        <h2 className="text-base font-bold text-foreground">Upload the filled CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only .csv is accepted. Excel: File → Save As → CSV (Comma delimited).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700">
            <Upload className="h-4 w-4" />
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) pickFile(f);
              }}
              className="sr-only"
            />
          </label>
          {fileName && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{fileName}</span> — {rowCount} row{rowCount === 1 ? "" : "s"} detected
            </span>
          )}
        </div>
      </section>

      {/* Step 3 — import */}
      <section className="rounded-xl border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Step 3
        </div>
        <h2 className="text-base font-bold text-foreground">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rows are inserted one at a time; any row that fails (missing required
          field, invalid date, duplicate email) is reported below without
          blocking the others.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !csvText}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {pending ? "Importing…" : `Import ${rowCount || ""} employee${rowCount === 1 ? "" : "s"}`}
        </button>
      </section>

      {/* Result */}
      {summary && (
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div className="text-base font-bold text-foreground">Import summary</div>
            <div className="text-xs text-muted-foreground">
              {summary.total} row{summary.total === 1 ? "" : "s"} processed
            </div>
          </div>
          <div className="mb-4 flex gap-3">
            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Inserted</div>
              <div className="text-xl font-bold text-emerald-800">{summary.inserted}</div>
            </div>
            <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Failed</div>
              <div className="text-xl font-bold text-rose-800">{summary.failed}</div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="w-14 px-3 py-1.5 text-left font-medium">Row</th>
                  <th className="w-16 px-3 py-1.5 text-left font-medium">Status</th>
                  <th className="px-3 py-1.5 text-left font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{r.row}</td>
                    <td className="px-3 py-1.5">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <AlertCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.ok ? (
                        <span className="text-foreground">
                          {r.employee}{" "}
                          <span className="font-mono text-muted-foreground">({r.name})</span>
                        </span>
                      ) : (
                        <div>
                          <div className="text-rose-700">{r.error}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.input.first_name} {r.input.last_name}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
