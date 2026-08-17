"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Loader2,
  PlayCircle,
  Plus,
  RotateCcw,
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
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
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
  const [staged, setStaged] = useState<string[]>([]);
  const [pick, setPick] = useState<string>("");
  const [pending, startTransition] = useTransition();

  // Reset local state whenever the dialog reopens so a prior
  // partial selection doesn't carry over.
  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setStaged([]);
      setPick("");
    }
  };

  const addPick = () => {
    if (!pick) return;
    if (existingIds.includes(pick)) {
      toast.info("Already on the attendee list.");
      setPick("");
      return;
    }
    if (staged.includes(pick)) {
      toast.info("Already staged.");
      setPick("");
      return;
    }
    setStaged((prev) => [...prev, pick]);
    setPick("");
  };

  const removeStaged = (id: string) =>
    setStaged((prev) => prev.filter((x) => x !== id));

  const submit = () => {
    if (staged.length === 0) {
      toast.info("Pick at least one employee.");
      return;
    }
    startTransition(async () => {
      const res = await addTrainingEventAttendeesAction(eventId, staged);
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

  const nameFor = (id: string) => {
    const e = employeeDirectory.find((x) => x.id === id);
    return e ? `${e.employee_name} (${e.id})` : id;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add attendees
          </DialogTitle>
          <DialogDescription>
            Pick employees to add to this training event. Anyone already
            on the list is skipped silently.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <EmployeePickerField
              name="attendee_pick"
              label="Employee"
              directory={employeeDirectory}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addPick}
              disabled={!pick}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add to list
            </Button>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Staged ({staged.length})
            </p>
            {staged.length === 0 ? (
              <p className="rounded-md border border-dashed border-input px-3 py-3 text-center text-xs text-muted-foreground">
                No one added yet — pick above.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {staged.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/[0.06] px-2 py-1 text-xs font-medium text-primary"
                  >
                    {nameFor(id)}
                    <button
                      type="button"
                      onClick={() => removeStaged(id)}
                      className="rounded p-0.5 hover:bg-primary/20"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
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
          <Button onClick={submit} disabled={pending || staged.length === 0}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {pending
              ? "Adding…"
              : `Add ${staged.length || ""} attendee${staged.length === 1 ? "" : "s"}`.trim()}
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
