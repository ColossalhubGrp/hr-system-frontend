"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import type { BulkAssignState } from "@/app/(workspace)/hr/shift-management/actions";

type Action = (
  prev: BulkAssignState,
  form: FormData,
) => Promise<BulkAssignState>;
const EMPTY: BulkAssignState = {};

type EmployeeOption = {
  id: string;
  name: string;
  department: string | null;
};

export function BulkAssignForm({
  action,
  employees,
  shiftTypes,
  companies,
  cancelHref,
}: {
  action: Action;
  employees: EmployeeOption[];
  shiftTypes: string[];
  companies: string[];
  cancelHref: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const departments = useMemo(() => {
    const s = new Set<string>();
    for (const e of employees) if (e.department) s.add(e.department);
    return Array.from(s).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (department && e.department !== department) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
      );
    });
  }, [employees, query, department]);

  const failureSet = useMemo(
    () => new Set((state.failures ?? []).map((f) => f.employee)),
    [state.failures],
  );

  function toggleAll() {
    if (filtered.every((e) => picked.has(e.id))) {
      const next = new Set(picked);
      for (const e of filtered) next.delete(e.id);
      setPicked(next);
    } else {
      const next = new Set(picked);
      for (const e of filtered) next.add(e.id);
      setPicked(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

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

      {typeof state.created === "number" && state.created > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-rise"
        >
          <CheckCircle2 className="h-4 w-4" />
          Created {state.created} assignment{state.created === 1 ? "" : "s"} —
          {state.failures && state.failures.length > 0
            ? ` ${state.failures.length} row${state.failures.length === 1 ? "" : "s"} failed (below).`
            : " done."}
        </p>
      )}

      <FormSection title="Shift">
        <Field
          label="Shift type"
          htmlFor="shift_type"
          required
          error={fe.shift_type}
        >
          <SelectInput
            id="shift_type"
            name="shift_type"
            options={shiftTypes}
            placeholder="Select shift"
            invalid={Boolean(fe.shift_type)}
          />
        </Field>
        <Field label="Company" htmlFor="company">
          <SelectInput
            id="company"
            name="company"
            options={companies}
            placeholder="—"
          />
        </Field>
        <Field
          label="Start date"
          htmlFor="start_date"
          required
          error={fe.start_date}
        >
          <TextInput
            id="start_date"
            name="start_date"
            type="date"
            invalid={Boolean(fe.start_date)}
          />
        </Field>
        <Field
          label="End date"
          htmlFor="end_date"
          error={fe.end_date}
          hint="Leave blank for open-ended."
        >
          <TextInput
            id="end_date"
            name="end_date"
            type="date"
            invalid={Boolean(fe.end_date)}
          />
        </Field>
      </FormSection>

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Employees
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-ash-600">
            <Users className="h-3.5 w-3.5" />
            {picked.size} selected · {filtered.length} shown ·{" "}
            {employees.length} total
          </span>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ID"
              className="h-10 w-full rounded-chip border border-hairline bg-surface pl-9 pr-4 text-sm placeholder:text-ash-500 focus-ring"
            />
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-10 rounded-chip border border-hairline bg-surface pl-3 pr-8 text-sm text-ash-800 focus-ring"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleAll}
            className="h-10 rounded-chip border border-hairline bg-surface px-3 text-xs font-medium text-ash-700 transition hover:bg-canvas focus-ring"
          >
            {filtered.every((e) => picked.has(e.id))
              ? "Clear filtered"
              : "Select filtered"}
          </button>
        </div>

        <ul className="max-h-[400px] divide-y divide-hairline overflow-y-auto rounded-card border border-hairline">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ash-500">
              No employees match the current filters.
            </li>
          )}
          {filtered.map((e) => {
            const checked = picked.has(e.id);
            const failed = failureSet.has(e.id);
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  failed && "bg-fall/[0.04]",
                )}
              >
                <input
                  type="checkbox"
                  id={`emp-${e.id}`}
                  name="employees"
                  value={e.id}
                  checked={checked}
                  onChange={() => toggleOne(e.id)}
                  className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
                />
                <label
                  htmlFor={`emp-${e.id}`}
                  className="flex flex-1 cursor-pointer items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ash-900">{e.name}</p>
                    <p className="text-xs text-ash-500">
                      {e.id}
                      {e.department ? ` · ${e.department}` : ""}
                    </p>
                  </div>
                  {failed && (
                    <span className="text-[10px] font-medium text-fall">
                      Failed
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {state.failures && state.failures.length > 0 && (
          <details className="mt-4 rounded-xl border border-fall/30 bg-fall/[0.04] px-3 py-2 text-xs text-fall">
            <summary className="cursor-pointer font-medium">
              {state.failures.length} row
              {state.failures.length === 1 ? "" : "s"} failed
            </summary>
            <ul className="mt-2 space-y-1 pl-5 list-disc">
              {state.failures.map((f) => (
                <li key={f.employee}>
                  <span className="font-mono">{f.employee}</span>: {f.error}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit count={picked.size} />
      </div>
    </form>
  );
}

function Submit({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <Layers className="h-4 w-4" />
      {pending
        ? "Assigning…"
        : `Assign to ${count} employee${count === 1 ? "" : "s"}`}
    </button>
  );
}
