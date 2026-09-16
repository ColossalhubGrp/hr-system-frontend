"use client";

import { useMemo, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Loader2,
  RefreshCw,
  Upload,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import type {
  PayrollTimesheetRow,
  TimesheetFlag,
} from "@/lib/frappe/payroll-timesheets";
import {
  importTimesheetsFromAttendance,
  listTimesheetsAction,
  uploadTimesheetCsv,
  upsertTimesheet,
  approveAllTimesheets,
} from "@/app/(workspace)/payroll/payruns-actions";

const SOURCE_STYLE: Record<string, { label: string; cls: string }> = {
  MANUAL:     { label: "Manual",     cls: "bg-slate-100 text-slate-700" },
  ATTENDANCE: { label: "Attendance", cls: "bg-emerald-100 text-emerald-700" },
  UPLOAD:     { label: "CSV",        cls: "bg-purple-100 text-purple-700" },
};

const CLASS_STYLE: Record<string, string> = {
  SALARIED:   "bg-primary/10 text-primary",
  HOURLY:     "bg-amber-100 text-amber-700",
  CONTRACTOR: "bg-purple-100 text-purple-700",
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function FlagChip({ flag }: { flag: TimesheetFlag }) {
  const cls =
    flag.severity === "error"
      ? "bg-rose-100 text-rose-700"
      : flag.severity === "warn"
      ? "bg-amber-100 text-amber-700"
      : "bg-blue-100 text-blue-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
        cls,
      )}
      title={flag.message}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {flag.code.replace(/_/g, " ")}
    </span>
  );
}

type Initial = {
  rows: PayrollTimesheetRow[];
  approved: number;
  with_flags: number;
  total: number;
};

export function TimesheetsPage({
  runId,
  runLabel,
  payDate,
  initial,
}: {
  runId: string;
  runLabel: string;
  payDate: string;
  initial: Initial;
}) {
  const [rows, setRows] = useState<PayrollTimesheetRow[]>(initial.rows);
  const [filter, setFilter] = useState<"all" | "flagged" | "unapproved">("all");
  const [importing, startImport] = useTransition();
  const [approving, startApprove] = useTransition();
  const [uploading, setUploading] = useState(false);

  const visible = useMemo(() => {
    if (filter === "flagged") return rows.filter((r) => r.flags.length > 0);
    if (filter === "unapproved") return rows.filter((r) => !r.approved);
    return rows;
  }, [rows, filter]);

  const approvedCount = rows.filter((r) => r.approved).length;
  const flaggedCount = rows.filter((r) => r.flags.length > 0).length;

  const patchRow = (name: string, patch: Partial<PayrollTimesheetRow>) =>
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, ...patch } : r)));

  /** Pull the fresh rows from the server and reset local state.
   *  router.refresh() re-runs the server component but leaves the
   *  client-held useState untouched, so mutations that add new
   *  rows (import + upload) also need an explicit re-hydrate. */
  async function refetch() {
    try {
      const res = await listTimesheetsAction(runId);
      setRows(res.rows);
    } catch {
      // Silent — a re-hydrate failure just means HR sees stale local
      // state; a manual refresh recovers.
    }
  }

  async function runImport() {
    startImport(async () => {
      try {
        const res = await importTimesheetsFromAttendance(runId);
        toast.success(
          `Imported ${res.imported} timesheets from ${res.period_from} → ${res.period_to}.`,
        );
        await refetch();
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Import failed.");
      }
    });
  }

  async function handleUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const res = await uploadTimesheetCsv(runId, text);
      if (res.rejected.length > 0) {
        toast.warning(
          `Uploaded ${res.accepted} rows. ${res.rejected.length} not matched: ${res.rejected.slice(0, 3).join(", ")}${res.rejected.length > 3 ? "…" : ""}`,
        );
      } else {
        toast.success(`Uploaded ${res.accepted} timesheet rows.`);
      }
      await refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      ev.target.value = "";
    }
  }

  async function approveAll() {
    startApprove(async () => {
      try {
        const res = await approveAllTimesheets(runId);
        toast.success(`Approved ${res.approved} timesheets.`);
        setRows((rs) => rs.map((r) => ({ ...r, approved: true })));
      } catch (err) {
        toast.error((err as { message?: string })?.message ?? "Approve failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/payroll/${encodeURIComponent(runId)}` as Route}
        className="w-fit inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to {runLabel}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Timesheets · {runLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay date {fmtDate(payDate)}. Review flagged hours, correct anything
            wrong, then approve — only approved timesheets flow into the pay
            run.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runImport}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Import from Attendance
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <a
            href={`/api/payroll/timesheets/export?run=${encodeURIComponent(runId)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            type="button"
            onClick={approveAll}
            disabled={approving || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve all
          </button>
        </div>
      </header>

      {/* Summary + filter tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterChip
          label={`All (${rows.length})`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterChip
          label={`Flagged (${flaggedCount})`}
          active={filter === "flagged"}
          onClick={() => setFilter("flagged")}
          tint="warn"
        />
        <FilterChip
          label={`Unapproved (${rows.length - approvedCount})`}
          active={filter === "unapproved"}
          onClick={() => setFilter("unapproved")}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {approvedCount} of {rows.length} approved
        </span>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No timesheets yet. Click <strong>Import from Attendance</strong> to
            pull hours from the Attendance module for the run&apos;s period, or
            <strong> Upload CSV</strong> to bring in externally-tracked hours.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            CSV columns:{" "}
            <code className="rounded bg-muted px-1">
              employee, regular_hours, overtime_hours, weekend_hours,
              holiday_hours, notes
            </code>
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Employee</TableHead>
                <TableHead className="px-4 text-right">Regular</TableHead>
                <TableHead className="px-4 text-right">OT</TableHead>
                <TableHead className="px-4 text-right">Weekend</TableHead>
                <TableHead className="px-4 text-right">Holiday</TableHead>
                <TableHead className="px-4 text-right">Expected</TableHead>
                <TableHead className="px-4">Flags</TableHead>
                <TableHead className="px-4">Source</TableHead>
                <TableHead className="px-4 text-right">Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TimesheetRow
                  key={r.name}
                  row={r}
                  runId={runId}
                  onPatch={patchRow}
                />
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t-2 bg-muted/30 font-bold">
                <TableCell className="px-4">Totals</TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, r) => a + r.regular_hours, 0).toFixed(1)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, r) => a + r.overtime_hours, 0).toFixed(1)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, r) => a + r.weekend_hours, 0).toFixed(1)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  {visible.reduce((a, r) => a + r.holiday_hours, 0).toFixed(1)}
                </TableCell>
                <TableCell className="px-4 text-right text-muted-foreground">
                  {visible.reduce((a, r) => a + r.expected_hours, 0).toFixed(0)}
                </TableCell>
                <TableCell className="px-4" />
                <TableCell className="px-4" />
                <TableCell className="px-4 text-right">
                  {visible.filter((r) => r.approved).length} / {visible.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  label, active, onClick, tint,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tint?: "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : tint === "warn"
          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );
}

function TimesheetRow({
  row,
  runId,
  onPatch,
}: {
  row: PayrollTimesheetRow;
  runId: string;
  onPatch: (name: string, patch: Partial<PayrollTimesheetRow>) => void;
}) {
  return (
    <TableRow className={cn(!row.approved && row.flags.length > 0 ? "bg-amber-50/30" : undefined)}>
      <TableCell className="px-4 align-middle">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
            {initials(row.employee_name || row.employee)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/employee/${encodeURIComponent(row.employee)}` as Route}
                className="font-semibold text-foreground hover:text-primary"
              >
                {row.employee_name || row.employee}
              </Link>
              <span
                className={cn(
                  "rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                  CLASS_STYLE[row.payroll_class],
                )}
              >
                {row.payroll_class}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {row.employee}
              {row.attendance_days ? ` · ${row.attendance_days} days` : ""}
              {row.is_manually_overridden ? " · overridden" : ""}
            </div>
          </div>
        </div>
      </TableCell>
      <HoursCell
        value={row.regular_hours}
        onCommit={async (v) => {
          onPatch(row.name, { regular_hours: v, source: "MANUAL", is_manually_overridden: true });
          await upsertTimesheet(runId, row.employee, { regular_hours: v });
        }}
      />
      <HoursCell
        value={row.overtime_hours}
        onCommit={async (v) => {
          onPatch(row.name, { overtime_hours: v, source: "MANUAL", is_manually_overridden: true });
          await upsertTimesheet(runId, row.employee, { overtime_hours: v });
        }}
        emphasize
      />
      <HoursCell
        value={row.weekend_hours}
        onCommit={async (v) => {
          onPatch(row.name, { weekend_hours: v, source: "MANUAL", is_manually_overridden: true });
          await upsertTimesheet(runId, row.employee, { weekend_hours: v });
        }}
      />
      <HoursCell
        value={row.holiday_hours}
        onCommit={async (v) => {
          onPatch(row.name, { holiday_hours: v, source: "MANUAL", is_manually_overridden: true });
          await upsertTimesheet(runId, row.employee, { holiday_hours: v });
        }}
      />
      <TableCell className="px-4 align-middle text-right text-muted-foreground">
        {row.expected_hours ? row.expected_hours.toFixed(0) : "—"}
      </TableCell>
      <TableCell className="px-4 align-middle">
        {row.flags.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.flags.map((f, i) => (
              <FlagChip key={`${f.code}-${i}`} flag={f} />
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="px-4 align-middle">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            SOURCE_STYLE[row.source].cls,
          )}
        >
          {SOURCE_STYLE[row.source].label}
        </span>
      </TableCell>
      <TableCell className="px-4 align-middle text-right">
        <ApproveToggle
          value={row.approved}
          onCommit={async (v) => {
            onPatch(row.name, { approved: v });
            await upsertTimesheet(runId, row.employee, { approved: v ? 1 : 0 });
          }}
        />
      </TableCell>
    </TableRow>
  );
}

function HoursCell({
  value,
  onCommit,
  emphasize,
}: {
  value: number;
  onCommit: (v: number) => Promise<void>;
  emphasize?: boolean;
}) {
  const [local, setLocal] = useState<string>(value ? value.toFixed(2) : "");
  const [pending, setPending] = useState(false);

  return (
    <TableCell className="px-4 align-middle text-right">
      <div className="inline-flex items-center gap-1">
        <input
          type="number"
          step="0.25"
          min="0"
          value={local}
          disabled={pending}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={async () => {
            const parsed = parseFloat(local || "0") || 0;
            if (parsed === value) return;
            setPending(true);
            try {
              await onCommit(parsed);
            } catch (err) {
              toast.error((err as { message?: string })?.message ?? "Save failed.");
              setLocal(value ? value.toFixed(2) : "");
            } finally {
              setPending(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "w-20 rounded-md border px-2 py-1 text-right text-sm disabled:bg-muted disabled:text-muted-foreground",
            emphasize && Number(local) > 0 ? "border-amber-300 bg-amber-50" : "",
          )}
          placeholder="0.00"
        />
        {pending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
      </div>
    </TableCell>
  );
}

function ApproveToggle({
  value,
  onCommit,
}: {
  value: boolean;
  onCommit: (v: boolean) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await onCommit(!value);
        } catch (err) {
          toast.error((err as { message?: string })?.message ?? "Save failed.");
        } finally {
          setPending(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition",
        value
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        pending ? "opacity-60" : "",
      )}
    >
      {pending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : value ? "✓ Approved" : "Approve"}
    </button>
  );
}
