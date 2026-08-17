"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  CalendarDays,
  Check,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field, TextArea, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  createLeaveTypeAction,
  deleteLeaveTypeAction,
  seedDefaultLeaveTypesAction,
  updateLeaveTypeAction,
  type FormState,
} from "@/app/(workspace)/settings/leave-types/actions";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LeaveTypeRow } from "@/lib/frappe/leave-types";

const EMPTY: FormState = {};

export function LeaveTypesAdmin({
  initial,
  canManage,
}: {
  initial: LeaveTypeRow[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState<LeaveTypeRow[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeRow | null>(null);
  const [seeding, startSeed] = useTransition();
  const router = useRouter();

  useEffect(() => setRows(initial), [initial]);

  const seedDefaults = () => {
    startSeed(async () => {
      const res = await seedDefaultLeaveTypesAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { created, skipped, errors } = res.summary;
      if (errors.length) {
        toast.warning(
          `Added ${created.length}, skipped ${skipped.length}, ${errors.length} failed.`,
          {
            description: errors
              .map((e) => `${e.name}: ${e.error}`)
              .join(" · "),
          },
        );
      } else if (created.length === 0) {
        toast.info("All defaults already exist — nothing to add.");
      } else {
        toast.success(
          `Seeded ${created.length} leave type${created.length === 1 ? "" : "s"}.`,
          { description: created.join(", ") },
        );
      }
      // Refresh the server-fetched initial so the table repopulates.
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <p className="text-xs text-muted-foreground">
          {canManage
            ? "Type name is user-facing — appears on the leave application form. Max days sets the yearly cap the auto-allocation uses."
            : "Read-only view. HR Director / Manager can add or edit."}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New leave type
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-24 text-right">Max days</TableHead>
            <TableHead className="w-40">Behaviour</TableHead>
            <TableHead>Notes</TableHead>
            {canManage && <TableHead className="w-24 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 5 : 4}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-3">
                  <p>No leave types yet.</p>
                  {canManage && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={seedDefaults}
                        disabled={seeding}
                        className="gap-1.5"
                      >
                        {seeding ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {seeding ? "Seeding…" : "Seed defaults"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        or add one manually with <b>New leave type</b> above.
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TypeRow
                key={r.name}
                row={r}
                canManage={canManage}
                onEdit={() => setEditing(r)}
                onRemoved={() =>
                  setRows((prev) => prev.filter((x) => x.name !== r.name))
                }
              />
            ))
          )}
        </TableBody>
      </Table>

      {canManage && (
        <>
          <CreateDialog
            open={openCreate}
            onOpenChange={setOpenCreate}
            onCreated={(created) => {
              setRows((prev) =>
                [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
              );
              setOpenCreate(false);
            }}
          />
          <EditDialog
            editing={editing}
            onOpenChange={(v) => {
              if (!v) setEditing(null);
            }}
            onSaved={(updated, originalName) => {
              setRows((prev) =>
                prev
                  .map((x) => (x.name === originalName ? updated : x))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              );
              setEditing(null);
            }}
          />
        </>
      )}
    </>
  );
}

function behaviourFlags(r: LeaveTypeRow): string[] {
  const flags: string[] = [];
  if (r.isEarnedLeave) flags.push("Earned");
  if (r.isCarryForward) flags.push("Carry-forward");
  if (r.isLwp) flags.push("Unpaid");
  if (r.includeHoliday) flags.push("Counts holidays");
  return flags;
}

function TypeRow({
  row,
  canManage,
  onEdit,
  onRemoved,
}: {
  row: LeaveTypeRow;
  canManage: boolean;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const [removing, startRemove] = useTransition();

  const remove = async () => {
    const res = await deleteLeaveTypeAction(row.name);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Deleted "${row.name}".`);
    onRemoved();
  };
  const runRemove = () =>
    new Promise<void>((resolve) => {
      startRemove(async () => {
        await remove();
        resolve();
      });
    });

  const flags = behaviourFlags(row);
  return (
    <TableRow>
      <TableCell className="align-top font-medium">{row.name}</TableCell>
      <TableCell className="align-top text-right tabular-nums">
        {row.maxLeavesAllowed || "—"}
      </TableCell>
      <TableCell className="align-top">
        {flags.length === 0 ? (
          <span className="text-xs text-muted-foreground">Standard paid</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {flags.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-muted-foreground">
        {row.description ? row.description : "—"}
      </TableCell>
      {canManage && (
        <TableCell className="text-right align-top">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              title="Edit type"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmDialog
              title={`Delete "${row.name}"?`}
              description="Existing leave applications that used this type stay intact but the type disappears from new applications."
              confirmLabel="Delete"
              destructive
              onConfirm={runRemove}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={removing}
                className="text-muted-foreground hover:text-destructive"
                title="Delete type"
              >
                {removing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </ConfirmDialog>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

// ── Create ───────────────────────────────────────────────────────────

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: LeaveTypeRow) => void;
}) {
  const [state, dispatch] = useFormState(createLeaveTypeAction, EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors ? "Check the highlighted fields." : undefined,
      });
    } else if (state.created) {
      toast.success(`Added "${state.created.name}".`);
      onCreated(state.created);
    }
  }, [state, onCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            New leave type
          </DialogTitle>
          <DialogDescription>
            Defines a leave category (Annual, Sick, Bereavement, …) that
            employees can apply for. The yearly cap here is what the system
            auto-allocates on the first application of the year.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-4 pt-2">
          <LeaveTypeFields fieldErrors={state.fieldErrors} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton icon="add" label="Add leave type" pendingLabel="Adding…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────

const UPDATE_EMPTY: FormState = {};

function EditDialog({
  editing,
  onOpenChange,
  onSaved,
}: {
  editing: LeaveTypeRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: LeaveTypeRow, originalName: string) => void;
}) {
  const open = editing !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit leave type
          </DialogTitle>
          <DialogDescription>
            Renaming updates the label everywhere the type appears going
            forward. Existing allocations keep their day counts.
          </DialogDescription>
        </DialogHeader>
        {editing && (
          <EditInner
            key={editing.name}
            row={editing}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditInner({
  row,
  onCancel,
  onSaved,
}: {
  row: LeaveTypeRow;
  onCancel: () => void;
  onSaved: (updated: LeaveTypeRow, originalName: string) => void;
}) {
  const [state, dispatch] = useFormState(updateLeaveTypeAction, UPDATE_EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors ? "Check the highlighted fields." : undefined,
      });
    } else if (state.updated && state.originalName) {
      toast.success(`Updated "${state.updated.name}".`);
      onSaved(state.updated, state.originalName);
    }
  }, [state, onSaved]);

  return (
    <form action={dispatch} className="flex flex-col gap-4 pt-2">
      <input type="hidden" name="original_name" value={row.name} />
      <LeaveTypeFields fieldErrors={state.fieldErrors} initial={row} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton icon="save" label="Save changes" pendingLabel="Saving…" />
      </DialogFooter>
    </form>
  );
}

// ── Shared form fields ────────────────────────────────────────────────

function LeaveTypeFields({
  fieldErrors,
  initial,
}: {
  fieldErrors?: Partial<Record<string, string>>;
  initial?: LeaveTypeRow;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Name"
        htmlFor="name"
        required
        error={fieldErrors?.name}
        wide
      >
        <TextInput
          id="name"
          name="name"
          placeholder="e.g. Annual Leave"
          defaultValue={initial?.name}
          invalid={Boolean(fieldErrors?.name)}
          autoFocus={!initial}
        />
      </Field>
      <Field
        label="Max days per year"
        htmlFor="max_leaves_allowed"
        required
        error={fieldErrors?.max_leaves_allowed}
        hint="How many days an employee gets each year. Used by the auto-allocation."
      >
        <TextInput
          id="max_leaves_allowed"
          name="max_leaves_allowed"
          type="number"
          min={0}
          step={0.5}
          defaultValue={initial?.maxLeavesAllowed ?? 15}
          invalid={Boolean(fieldErrors?.max_leaves_allowed)}
        />
      </Field>
      <Field
        label="Waiting period (days)"
        htmlFor="applicable_after"
        error={fieldErrors?.applicable_after}
        hint="Days after joining before this type is usable. 0 = immediately."
      >
        <TextInput
          id="applicable_after"
          name="applicable_after"
          type="number"
          min={0}
          defaultValue={initial?.applicableAfter ?? 0}
          invalid={Boolean(fieldErrors?.applicable_after)}
        />
      </Field>
      <div className="col-span-full flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Behaviour
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            name="is_earned_leave"
            defaultChecked={initial?.isEarnedLeave}
            label="Earned"
            hint="Accrues over time instead of being lump-sum allocated."
          />
          <Checkbox
            name="is_carry_forward"
            defaultChecked={initial?.isCarryForward}
            label="Carry-forward"
            hint="Unused days roll into next year's allocation."
          />
          <Checkbox
            name="is_lwp"
            defaultChecked={initial?.isLwp}
            label="Leave without pay"
            hint="Payroll deducts salary for days taken."
          />
          <Checkbox
            name="include_holiday"
            defaultChecked={initial?.includeHoliday}
            label="Count holidays"
            hint="Weekends / holidays inside the leave window count as leave days."
          />
        </div>
      </div>
      <Field label="Notes" htmlFor="description" wide>
        <TextArea
          id="description"
          name="description"
          rows={2}
          placeholder="Optional — HR-only reference notes."
          defaultValue={initial?.description ?? ""}
        />
      </Field>
    </div>
  );
}

function Checkbox({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-input bg-background p-2.5 text-sm has-[:checked]:border-primary/40 has-[:checked]:bg-primary/[0.04]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function SubmitButton({
  icon,
  label,
  pendingLabel,
}: {
  icon: "add" | "save";
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon === "add" ? (
        <Plus className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}
