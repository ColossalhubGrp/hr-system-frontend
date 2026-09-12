"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Filter,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { EmployeeAvatar } from "@/components/employee/avatar";
import type { AttendableEmployee } from "@/lib/frappe/attendance-bulk";
import type { BulkMarkState } from "@/app/(workspace)/hr/attendance/bulk/actions";

type Action = (prev: BulkMarkState, form: FormData) => Promise<BulkMarkState>;
const EMPTY: BulkMarkState = {};

const STATUSES = ["Present", "Absent", "On Leave", "Half Day", "Work From Home"] as const;
type Status = (typeof STATUSES)[number] | "";

export function BulkMarkForm({
  action,
  employees,
  departments,
  branches,
  companies,
  shifts,
  activeFilters,
}: {
  action: Action;
  employees: AttendableEmployee[];
  departments: string[];
  branches: string[];
  companies: string[];
  shifts: string[];
  activeFilters: {
    department: string;
    branch: string;
    company: string;
    shift: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, dispatch] = useFormState(action, EMPTY);
  const today = new Date().toISOString().slice(0, 10);

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const setStatus = (empId: string, s: Status) =>
    setStatuses((prev) => ({ ...prev, [empId]: s }));
  const applyToAll = (s: Status) => {
    const next: Record<string, Status> = {};
    for (const e of employees) next[e.id] = s;
    setStatuses(next);
  };
  const markedCount = Object.values(statuses).filter((s) => s !== "").length;

  const rowsJson = useMemo(() => {
    const rows: Array<{ employee: string; status: Status; shift?: string }> = [];
    for (const e of employees) {
      const s = statuses[e.id];
      if (s) rows.push({ employee: e.id, status: s, shift: e.defaultShift ?? undefined });
    }
    return JSON.stringify(rows);
  }, [employees, statuses]);

  const setFilter = (key: string, val: string) => {
    const q = new URLSearchParams(params?.toString() ?? "");
    if (val) q.set(key, val);
    else q.delete(key);
    router.push(`/hr/attendance/bulk?${q.toString()}`);
  };

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {state.result && (
        <ResultBanner result={state.result} />
      )}

      {/* Day + filters */}
      <section className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm md:col-span-1">
          <span className="text-xs font-medium text-ash-600">
            Date <span className="text-fall">*</span>
          </span>
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            className={cn(
              "h-10 rounded-md border bg-white px-2 text-sm focus-ring",
              state.fieldErrors?.date ? "border-fall" : "border-hairline",
            )}
          />
        </label>

        <FilterSelect
          label="Company"
          value={activeFilters.company}
          options={companies}
          onChange={(v) => setFilter("company", v)}
        />
        <FilterSelect
          label="Branch"
          value={activeFilters.branch}
          options={branches}
          onChange={(v) => setFilter("branch", v)}
        />
        <FilterSelect
          label="Department"
          value={activeFilters.department}
          options={departments}
          onChange={(v) => setFilter("department", v)}
        />
        <FilterSelect
          label="Default shift"
          value={activeFilters.shift}
          options={shifts}
          onChange={(v) => setFilter("shift", v)}
        />
      </section>

      {/* Bulk-apply bar + safety toggles */}
      <section className="card flex flex-wrap items-center gap-3 p-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ash-600">
          <Filter className="h-3.5 w-3.5" />
          Apply to all {employees.length}:
        </span>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => applyToAll(s)}
            className="rounded-chip border border-hairline px-2.5 py-1 text-[11px] font-medium text-ash-700 transition hover:border-ink-400 hover:text-ink-800 focus-ring"
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyToAll("")}
          className="rounded-chip px-2.5 py-1 text-[11px] font-medium text-ash-500 transition hover:bg-canvas focus-ring"
        >
          Clear all
        </button>
        <span className="ml-auto flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-xs text-ash-700">
            <input
              type="checkbox"
              name="skip_holidays"
              defaultChecked
              className="h-3.5 w-3.5 rounded border-hairline text-ink-700 focus-ring"
            />
            Skip holidays
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-ash-700">
            <input
              type="checkbox"
              name="skip_on_leave"
              defaultChecked
              className="h-3.5 w-3.5 rounded border-hairline text-ink-700 focus-ring"
            />
            Skip approved leave
          </label>
        </span>
      </section>

      {/* Employees table */}
      <section className="card overflow-hidden p-0">
        {employees.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash-500">
            No employees match the current filters.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5">Employee</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Designation</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Department</th>
                <th className="px-4 py-2.5 hidden lg:table-cell">Shift</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <EmployeeAvatar name={e.employeeName} imageUrl={e.image} size="sm" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-ink-900">
                          {e.employeeName}
                        </span>
                        <span className="truncate text-[11px] text-ash-500">
                          {e.id}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-ash-700">
                    {e.designation ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-ash-700">
                    {e.department ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-ash-700">
                    {e.defaultShift ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={statuses[e.id] ?? ""}
                      onChange={(ev) => setStatus(e.id, ev.target.value as Status)}
                      className="h-8 rounded-md border border-hairline bg-white px-2 text-xs focus-ring"
                    >
                      <option value="">— skip —</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <input type="hidden" name="rows_json" value={rowsJson} />

      <div className="-mx-1 mt-2 flex items-center justify-between gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <span className="text-xs text-ash-600">
          <strong className="text-ink-900">{markedCount}</strong> of {employees.length} marked
        </span>
        <SaveBtn disabled={markedCount === 0} />
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-ash-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
      >
        <option value="">— any —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save attendance
        </>
      )}
    </button>
  );
}

function ResultBanner({ result }: { result: BulkMarkState["result"] }) {
  if (!result) return null;
  const { created, skipped, errored } = result.totals;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-ink-900">
      <p className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="h-4 w-4 text-rise" />
        Saved <strong>{created}</strong> · Skipped {skipped} · Errored{" "}
        {errored}
      </p>
      {errored > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-fall">
            {errored} row{errored === 1 ? "" : "s"} failed — click for detail
          </summary>
          <ul className="mt-1 flex flex-col gap-1 text-ash-700">
            {result.errored.map((e, i) => (
              <li key={i}>
                <code className="font-mono">{e.employee}</code> · {e.date} —{" "}
                {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skipped > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-ash-600">
            {skipped} row{skipped === 1 ? "" : "s"} skipped
          </summary>
          <ul className="mt-1 flex flex-col gap-1 text-ash-600">
            {result.skipped.map((s, i) => (
              <li key={i}>
                <code className="font-mono">{s.employee}</code> · {s.date} —{" "}
                {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <span className="inline-flex items-center gap-1 text-[11px] text-ash-500">
        <CalendarCheck className="h-3 w-3" />
        Reload the Attendance list to see the fresh rows.
      </span>
    </div>
  );
}
