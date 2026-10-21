"use server";

import { frappeCall, FrappeRequestError } from "@/lib/frappe/client";

export type BulkImportColumn = {
  /** Column name as it appears in the CSV header (case-insensitive match). */
  csvHeader: string;
  /** Frappe fieldname to insert into. */
  fieldname: string;
  /** True if this column must have a value on every row. */
  required?: boolean;
  /** Coerce the raw string value before insert. */
  coerce?: "string" | "number" | "boolean";
};

export type BulkImportConfig = {
  doctype: string;
  columns: BulkImportColumn[];
  /** Extra fields merged into every doc on insert (e.g. defaults). */
  defaults?: Record<string, unknown>;
};

export type BulkImportSummary = {
  inserted: number;
  failed: number;
  errors: Array<{ row: number; name?: string; message: string }>;
};

/**
 * Walk a CSV string row-by-row, map named columns to Frappe fieldnames,
 * and insert each row via `frappe.client.insert`. Rows that fail
 * individually are reported but do NOT abort the import — the rest
 * continue. Each caller provides its own doctype + column spec.
 */
export async function runBulkImport(
  csvText: string,
  config: BulkImportConfig,
): Promise<BulkImportSummary> {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { inserted: 0, failed: 0, errors: [{ row: 0, message: "Empty file." }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  // Resolve each configured column to its header column index.
  const colIndex = new Map<string, number>();
  for (const col of config.columns) {
    const idx = header.indexOf(col.csvHeader.trim().toLowerCase());
    if (idx !== -1) colIndex.set(col.fieldname, idx);
    else if (col.required) {
      return {
        inserted: 0,
        failed: 0,
        errors: [{ row: 0, message: `Missing required column "${col.csvHeader}".` }],
      };
    }
  }

  const summary: BulkImportSummary = { inserted: 0, failed: 0, errors: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed

    const doc: Record<string, unknown> = { doctype: config.doctype, ...(config.defaults ?? {}) };
    let bad = false;
    for (const col of config.columns) {
      const idx = colIndex.get(col.fieldname);
      const raw = idx === undefined ? "" : (row[idx] ?? "").trim();
      if (!raw) {
        if (col.required) {
          summary.failed += 1;
          summary.errors.push({ row: rowNum, message: `Missing "${col.csvHeader}".` });
          bad = true;
          break;
        }
        continue;
      }
      const value = coerce(raw, col.coerce);
      doc[col.fieldname] = value;
    }
    if (bad) continue;

    try {
      const saved = await frappeCall<{ name: string }>({
        method: "frappe.client.insert",
        verb: "POST",
        args: { doc },
        as: "user",
      });
      summary.inserted += 1;
      // Keep a thin "success" trace by stashing the created name on the
      // last error-ish entry? No — errors[] stays error-only. The UI
      // reads summary.inserted for the headline count.
      void saved;
    } catch (e) {
      summary.failed += 1;
      summary.errors.push({
        row: rowNum,
        message: humanise(e),
      });
    }
  }

  return summary;
}

function coerce(raw: string, kind?: "string" | "number" | "boolean"): unknown {
  if (!kind || kind === "string") return raw;
  if (kind === "number") {
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (kind === "boolean") {
    const s = raw.toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s)) return 1;
    if (["0", "false", "no", "n", "off"].includes(s)) return 0;
    return 0;
  }
  return raw;
}

function humanise(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (!raw) return "Insert failed.";
  const s = raw.toLowerCase();
  if (s.includes("duplicate") || s.includes("already exists") || err instanceof FrappeRequestError && err.status === 409) {
    return "Already exists — skipped.";
  }
  if (s.includes("mandatory")) return "A required field is missing on this row.";
  if (s.includes("permission") || s.includes("403")) return "No permission to create this record.";
  if (s.includes("validation")) return "Validation failed on this row.";
  // Trim to a single line to avoid Frappe's multi-paragraph tracebacks
  // leaking into the UI.
  return raw.split("\n")[0]!.slice(0, 180);
}

function parseCsv(text: string): string[][] {
  const clean = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"')      { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n"){ row.push(field); field = ""; rows.push(row); row = []; }
      else                { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}
