"use server";

import { revalidatePath } from "next/cache";
import {
  bulkMarkAttendance,
  type BulkMarkResult,
  type BulkMarkRow,
} from "@/lib/frappe/attendance-bulk";
import { toFormState, type StdFormState } from "@/lib/frappe/form-errors";
import { getMyAccess } from "@/lib/frappe/roles";

export type UploadState = StdFormState & { result?: BulkMarkResult };

const ATTENDANCE_STATUSES = new Set([
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
]);

/**
 * CSV shape (case-insensitive column names, order doesn't matter):
 *   employee, date, status[, shift]
 *
 * Header row required. Blank rows skipped. Rows with invalid status or
 * malformed date are reported back so the uploader knows which lines
 * to fix. Delegates to the same admin_bulk_mark_attendance endpoint
 * the Bulk Mark tool uses, so already-marked days are skipped and the
 * import is safe to re-run.
 */
export async function uploadAttendanceCsvAction(
  _prev: UploadState,
  form: FormData,
): Promise<UploadState> {
  const access = await getMyAccess();
  if (!access.isHrAdmin) {
    return { error: "Only HR admins can upload attendance." };
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a CSV file to upload." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Upload is capped at 2 MB (roughly 40,000 rows)." };
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (parsed.rows.length === 0) {
    return {
      error:
        parsed.error ??
        "No usable rows found. Header must include employee, date, status.",
    };
  }
  if (parsed.error) return { error: parsed.error };

  const rows: BulkMarkRow[] = [];
  const rejects: Array<{ employee: string; date: string; reason: string }> = [];
  for (const r of parsed.rows) {
    const emp = (r.employee ?? "").trim();
    const date = (r.date ?? "").trim();
    const status = (r.status ?? "").trim();
    const shift = (r.shift ?? "").trim();
    if (!emp) {
      rejects.push({ employee: "", date, reason: "missing employee" });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      rejects.push({ employee: emp, date, reason: "malformed date (want YYYY-MM-DD)" });
      continue;
    }
    if (!ATTENDANCE_STATUSES.has(status)) {
      rejects.push({
        employee: emp,
        date,
        reason: `invalid status "${status}"`,
      });
      continue;
    }
    rows.push({
      employee: emp,
      date,
      status,
      shift: shift || undefined,
    });
  }

  if (rows.length === 0) {
    return {
      error: `Nothing to save — every row was rejected (${rejects.length} row${rejects.length === 1 ? "" : "s"}).`,
      result: {
        ok: false,
        created: [],
        skipped: [],
        errored: rejects,
        totals: { created: 0, skipped: 0, errored: rejects.length },
      },
    };
  }

  const skipHolidays = form.get("skip_holidays") === "on";
  const skipOnLeave = form.get("skip_on_leave") === "on";

  try {
    const result = await bulkMarkAttendance({
      rows,
      skipHolidays,
      skipOnLeave,
    });
    // Merge locally-rejected rows into the errored bucket so the
    // uploader sees the full picture in one banner.
    const merged: BulkMarkResult = {
      ...result,
      errored: [...rejects, ...result.errored],
      totals: {
        ...result.totals,
        errored: result.totals.errored + rejects.length,
      },
    };
    revalidatePath("/hr/attendance");
    return { result: merged };
  } catch (err) {
    return toFormState(err);
  }
}

// --- tiny CSV parser -------------------------------------------------------
// Deliberately in-house: attendance CSVs are simple (employee/date/status/shift)
// and pulling papaparse just for this pays a bundle-size tax the whole
// workspace pays. Handles quoted fields with embedded commas.

function parseCsv(text: string): {
  rows: Array<Record<string, string>>;
  error?: string;
} {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: "File needs a header row + at least one data row." };
  }
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const needed = ["employee", "date", "status"];
  for (const n of needed) {
    if (!header.includes(n)) {
      return {
        rows: [],
        error: `Missing header column "${n}". Required: employee, date, status. Optional: shift.`,
      };
    }
  }
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    out.push(row);
  }
  return { rows: out };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}
