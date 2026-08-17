"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Filter,
  Loader2,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SelectInput } from "@/components/employee/form-bits";
import { type EmployeeDirectoryEntry } from "@/components/common/employee-picker-field";
import {
  addTrainingEventAttendeesAction,
  removeTrainingEventAttendeeAction,
  setTrainingEventStatusAction,
} from "@/app/(workspace)/hr/training/actions";

type Status = "Scheduled" | "In Progress" | "Completed" | "Cancelled";

/** Status transition bar. Which buttons show depends on the
 *  current status — no "Complete" on a Cancelled event, etc.
 *  Fires the same server action for every transition. */
export function EventStatusBar({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const current = status as Status;

  const call = (next: Status) =>
    startTransition(async () => {
      const res = await setTrainingEventStatusAction(eventId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Status set to "${next}".`);
    });

  // Which transitions are meaningful from each state.
  const paths: Record<Status, Status[]> = {
    Scheduled: ["In Progress", "Cancelled"],
    "In Progress": ["Completed", "Cancelled"],
    Completed: ["In Progress"],
    Cancelled: ["Scheduled"],
  };
  const next = paths[current] ?? [];
  if (next.length === 0) return null;

  const iconFor = (s: Status) =>
    s === "In Progress" ? (
      <PlayCircle className="h-3.5 w-3.5" />
    ) : s === "Completed" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : s === "Cancelled" ? (
      <CircleSlash className="h-3.5 w-3.5" />
    ) : (
      <RotateCcw className="h-3.5 w-3.5" />
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next.map((s) => (
        <Button
          key={s}
          size="sm"
          variant="outline"
          onClick={() => call(s)}
          disabled={pending}
          className="gap-1.5"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iconFor(s)}
          {s === "In Progress"
            ? "Start"
            : s === "Completed"
              ? "Complete"
              : s === "Cancelled"
                ? "Cancel"
                : "Reopen"}
        </Button>
      ))}
    </div>
  );
}

// ── Attendee add ──────────────────────────────────────────────────────

/** Add-attendees dialog. Picks employees one at a time with the
 *  shared picker, collects them as chips, submits all at once.
 *  Idempotent on the backend — re-adding an existing attendee is
 *  a no-op silently absorbed as `skipped`. */
export function AddAttendeesButton({
  eventId,
  employeeDirectory,
  existingIds,
}: {
  eventId: string;
  employeeDirectory: EmployeeDirectoryEntry[];
  existingIds: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add attendees
      </Button>
      <AddAttendeesDialog
        eventId={eventId}
        employeeDirectory={employeeDirectory}
        existingIds={existingIds}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function AddAttendeesDialog({
  eventId,
  employeeDirectory,
  existingIds,
  open,
  onOpenChange,
}: {
  eventId: string;
  employeeDirectory: EmployeeDirectoryEntry[];
  existingIds: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);
  // Only offer employees who aren't already on the list — dedup at
  // the source rather than filtering silently on submit.
  const selectable = useMemo(
    () => employeeDirectory.filter((e) => !existingSet.has(e.id)),
    [employeeDirectory, existingSet],
  );

  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [company, setCompany] = useState("");
  const [grade, setGrade] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Filter option lists derived from what's actually on the roster.
  const departments = useMemo(
    () =>
      Array.from(
        new Set(selectable.map((e) => e.department).filter(Boolean) as string[]),
      ).sort(),
    [selectable],
  );
  const companies = useMemo(
    () =>
      Array.from(
        new Set(selectable.map((e) => e.company).filter(Boolean) as string[]),
      ).sort(),
    [selectable],
  );
  const grades = useMemo(
    () =>
      Array.from(
        new Set(selectable.map((e) => e.pay_grade).filter(Boolean) as string[]),
      ).sort(),
    [selectable],
  );

  // Rows visible after applying search + filters. Selection is
  // stored globally so switching filters doesn't lose earlier
  // picks — the counter always shows total picks, not just those
  // matching the current filter.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return selectable.filter((e) => {
      if (dept && e.department !== dept) return false;
      if (company && e.company !== company) return false;
      if (grade && e.pay_grade !== grade) return false;
      if (!q) return true;
      const hay = `${e.employee_name} ${e.id} ${e.department ?? ""} ${e.designation ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [selectable, query, dept, company, grade]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const e of filtered) next.delete(e.id);
      } else {
        for (const e of filtered) next.add(e.id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setDept("");
    setCompany("");
    setGrade("");
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setSelected(new Set());
      clearFilters();
    }
  };

  const submit = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.info("Pick at least one employee.");
      return;
    }
    startTransition(async () => {
      const res = await addTrainingEventAttendeesAction(eventId, ids);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const parts: string[] = [];
      if (res.added.length) parts.push(`${res.added.length} added`);
      if (res.skipped.length) parts.push(`${res.skipped.length} skipped`);
      toast.success(parts.join(" · ") || "Attendees updated.");
      handleOpenChange(false);
    });
  };

  const hasAnyFilter = Boolean(query || dept || company || grade);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add attendees
          </DialogTitle>
          <DialogDescription>
            Filter the roster and tick everyone who should attend. People
            already on the list are hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {/* Search + filter row */}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by name, ID, department, designation…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-ring"
              />
            </label>
            {departments.length > 0 && (
              <SelectInput
                name="filter_dept"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                options={departments}
                placeholder="All departments"
              />
            )}
            {companies.length > 1 && (
              <SelectInput
                name="filter_company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                options={companies}
                placeholder="All companies"
              />
            )}
            {grades.length > 0 && (
              <SelectInput
                name="filter_grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={grades}
                placeholder="All grades"
              />
            )}
          </div>

          {/* Toolbar: match count + select-all + clear filters */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Filter className="h-3 w-3" />
              {filtered.length} of {selectable.length}{" "}
              {selectable.length === 1 ? "person" : "people"} match
              {selected.size > 0 && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {selected.size} selected
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="text-xs underline-offset-2 hover:underline"
                >
                  {allFilteredSelected
                    ? `Deselect all ${filtered.length}`
                    : `Select all ${filtered.length}`}
                </button>
              )}
            </span>
          </div>

          {/* Roster list */}
          <div className="max-h-80 overflow-y-auto rounded-md border border-input">
            {selectable.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Everyone in the directory is already on the attendee list.
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No one matches the current filters.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((e) => {
                  const isSel = selected.has(e.id);
                  return (
                    <li key={e.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition ${
                          isSel ? "bg-primary/[0.04]" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(e.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-foreground">
                            {e.employee_name}
                          </span>
                          <span className="truncate text-[10px] text-muted-foreground">
                            {e.id}
                            {e.department ? ` · ${e.department}` : ""}
                            {e.designation ? ` · ${e.designation}` : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || selected.size === 0}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {pending
              ? "Adding…"
              : selected.size === 0
                ? "Add attendees"
                : `Add ${selected.size} attendee${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Attendee remove ───────────────────────────────────────────────────

export function RemoveAttendeeButton({
  eventId,
  employeeId,
  label,
}: {
  eventId: string;
  employeeId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  const remove = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await removeTrainingEventAttendeeAction(
          eventId,
          employeeId,
        );
        if (!res.ok) toast.error(res.error);
        else toast.success(`Removed ${label}.`);
        resolve();
      });
    });

  return (
    <ConfirmDialog
      title={`Remove ${label}?`}
      description="They'll be dropped from this event's attendee list. Their overall training history is unaffected."
      confirmLabel="Remove"
      destructive
      onConfirm={remove}
    >
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        className="text-muted-foreground hover:text-destructive"
        title="Remove attendee"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </ConfirmDialog>
  );
}

// ── Empty-state helper for the alert when no attendees + not editable
export function NoAttendeesEmpty() {
  return (
    <p className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-6 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4" />
      No attendees added yet.
    </p>
  );
}
