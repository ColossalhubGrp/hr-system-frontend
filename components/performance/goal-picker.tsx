"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search, Check, Plus, X } from "lucide-react";

export type PickableGoal = {
  id: string;
  goalName: string;
  employee: string | null;
  employeeName: string | null;
  status: string;
  progress: number;
};

/**
 * Multi-select goal picker used by the cycle-creation form. Emits the
 * checked goal IDs as a comma-separated string in a hidden form field so
 * the parent <form> action can read them without JS plumbing.
 *
 * Optimised for the case where HR has a small-to-medium pool of unassigned
 * goals (≤200) — we render them all client-side with a simple text filter.
 * For larger pools, swap in a paginated search.
 */
export function GoalPicker({
  goals,
  name = "selected_goals",
  initialSelected,
  createHref,
}: {
  goals: PickableGoal[];
  /** Form field name to emit the CSV of selected goal IDs into. */
  name?: string;
  /** Pre-selected goal IDs (for editing an existing cycle's roster). */
  initialSelected?: string[];
  /** If provided, the empty state renders a "Create goal" button linking
   *  here — otherwise the empty state is just a text hint. */
  createHref?: string;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected ?? []),
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return goals;
    return goals.filter((g) => {
      const hay = `${g.goalName} ${g.employeeName ?? ""} ${g.employee ?? ""} ${g.id}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q, goals]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden CSV field — the Server Action reads this name. */}
      <input type="hidden" name={name} value={[...selected].join(",")} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-ash-700">
          <span className="rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-800">
            {selected.size}
          </span>
          <span>
            of {goals.length} {goals.length === 1 ? "goal" : "goals"} selected
          </span>
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1 rounded-chip border border-hairline px-2 py-0.5 text-xs text-ash-700 hover:bg-canvas focus-ring"
          >
            <X className="h-3 w-3" />
            Clear selection
          </button>
        )}
      </div>

      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ash-500" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search goals by title, employee, or id…"
          className="h-10 w-full rounded-xl border border-hairline bg-surface pl-9 pr-3 text-sm placeholder:text-ash-500 focus-ring"
        />
      </label>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-canvas/50 px-4 py-8 text-center text-sm text-ash-600">
          <p>No goals to pick from yet. Create one to add it to this cycle.</p>
          {createHref && (
            <Link
              href={createHref as Route}
              className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3.5 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring"
            >
              <Plus className="h-3.5 w-3.5" />
              Create goal
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-4 py-4 text-center text-xs text-ash-500">
          No goals match "{q}".
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-card border border-hairline bg-surface">
          <ul className="divide-y divide-hairline">
            {filtered.map((g) => {
              const isOn = selected.has(g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition focus-ring ${
                      isOn ? "bg-rise/[0.06]" : "hover:bg-canvas/50"
                    }`}
                    aria-pressed={isOn}
                  >
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        isOn
                          ? "border-rise bg-rise text-white"
                          : "border-hairline bg-surface"
                      }`}
                      aria-hidden
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <span className="truncate font-medium text-ink-800">
                        {g.goalName}
                      </span>
                      <span className="truncate text-xs text-ash-500">
                        {g.employeeName ?? g.employee ?? "Unassigned"} ·{" "}
                        {g.status} · {Math.round(g.progress)}%
                      </span>
                    </span>
                    <span className="rounded-chip bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-800">
                      {g.id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
