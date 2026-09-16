"use client";

import { useState } from "react";
import { Download } from "lucide-react";

/**
 * Small "Timesheet export" launcher — opens a date-range picker
 * and hits `/api/payroll/timesheets/export?from=&to=` which
 * proxies `admin_export_timesheets_csv` and returns a CSV
 * download.
 *
 * Kept as its own component (client-only) so the Attendance page
 * itself can stay server-rendered.
 */
export function TimesheetExportButton() {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(iso(firstOfMonth));
  const [to, setTo] = useState(iso(today));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-sm font-medium text-ash-700 transition hover:border-ink-400 hover:text-ink-800 focus-ring"
      >
        <Download className="h-4 w-4" />
        Export timesheets
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-bold text-ink-900">
              Export timesheets
            </h3>
            <p className="mb-4 text-xs text-ash-600">
              Pick the date range (matched on Payroll Run pay date). One row
              per employee-per-run, columns include regular / OT / weekend /
              holiday hours + source.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-ash-600">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-ash-600">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ash-600 hover:bg-canvas"
              >
                Cancel
              </button>
              <a
                href={`/api/payroll/timesheets/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => setOpen(false)}
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
