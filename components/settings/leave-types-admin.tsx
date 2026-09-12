"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertTriangle,
  CalendarDays,
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
  readMeta,
}: {
  initial: LeaveTypeRow[];
  canManage: boolean;
  /** Only populated when initial.length === 0 — carries diagnostic
   *  info about which read path was tried so we can distinguish
   *  a genuinely-empty tenant from a broken read. */
  readMeta?: {
    path: "admin_method" | "service_fallback" | "none";
    primaryError: string | null;
    fallbackError: string | null;
  } | null;
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
                  {readMeta && readMeta.path === "none" && (
                    <div className="mx-auto max-w-2xl rounded-md border border-amber-300 bg-amber-100/60 px-3 py-2 text-left text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div className="flex flex-col gap-2">
                          <b>Backend didn't return any rows.</b>
                          {readMeta.primaryError && (
                            <div>
                              <b>Admin method:</b>
                              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-amber-50/70 p-2 font-mono text-[10px]">
                                {readMeta.primaryError}
                              </pre>
                            </div>
                          )}
                          {readMeta.fallbackError && (
                            <div>
                              <b>Fallback:</b>
                              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-amber-50/70 p-2 font-mono text-[10px]">
                                {readMeta.fallbackError}
                              </pre>
                            </div>
                          )}
                          {!readMeta.primaryError && !readMeta.fallbackError && (
                            <span>
                              Both read paths returned an empty list without
                              erroring. The DB may actually be empty on this
                              tenant — run <b>Seed defaults</b>, or check
                              whether the Frappe backend has been redeployed.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
          <Checkbox
            name="is_compensatory"
            defaultChecked={initial?.isCompensatory}
            label="Compensatory"
            hint="Employee earns this by working on a holiday. Comp-off Request writes to it."
          />
          <Checkbox
            name="is_optional_leave"
            defaultChecked={initial?.isOptionalLeave}
            label="Optional"
            hint="Employee picks from a company-supplied pool (festivals etc.)."
          />
          <Checkbox
            name="allow_encashment"
            defaultChecked={initial?.allowEncashment}
            label="Allow encashment"
            hint="Unused days can be paid out via Leave Encashment."
          />
          <Checkbox
            name="allow_negative"
            defaultChecked={initial?.allowNegativeBalance}
            label="Allow negative balance"
            hint="Employees can apply even if the balance goes below zero."
          />
          <Checkbox
            name="allow_over_allocation"
            defaultChecked={initial?.allowOverAllocation}
            label="Allow over-allocation"
            hint="HR can allocate more than the yearly max."
          />
          <Checkbox
            name="is_partially_paid_leave"
            defaultChecked={initial?.isPartiallyPaidLeave}
            label="Partially paid"
            hint="Payroll docks a fraction of daily salary instead of full pay."
          />
        </div>
      </div>
      <Field
        label="Max continuous days"
        htmlFor="max_continuous_days_allowed"
        hint="0 = no cap. Blocks long unbroken applications."
      >
        <TextInput
          id="max_continuous_days_allowed"
          name="max_continuous_days_allowed"
          type="number"
          min={0}
          defaultValue={initial?.maxContinuousDaysAllowed ?? 0}
        />
      </Field>
      <Field
        label="Fraction of daily salary per leave"
        htmlFor="fraction_of_daily_salary_per_leave"
        hint="Only when partially-paid is on. 0.5 = half pay per day."
      >
        <TextInput
          id="fraction_of_daily_salary_per_leave"
          name="fraction_of_daily_salary_per_leave"
          type="number"
          min={0}
          max={1}
          step={0.05}
          defaultValue={initial?.fractionOfDailySalaryPerLeave ?? 0}
        />
      </Field>
      <Field
        label="Encashment threshold (days)"
        htmlFor="encashment_threshold_days"
        hint="Only the balance above this is encashable."
      >
        <TextInput
          id="encashment_threshold_days"
          name="encashment_threshold_days"
          type="number"
          min={0}
          defaultValue={initial?.encashmentThresholdDays ?? 0}
        />
      </Field>
      <Field
        label="Earning component (payroll)"
        htmlFor="earning_component"
        hint="Salary component the encashment amount pays out through."
      >
        <TextInput
          id="earning_component"
          name="earning_component"
          placeholder="e.g. Leave Encashment"
          defaultValue={initial?.earningComponent ?? ""}
        />
      </Field>
      <Field
        label="Earned-leave frequency"
        htmlFor="earned_leave_frequency"
        hint="How often accrual runs."
      >
        <select
          id="earned_leave_frequency"
          name="earned_leave_frequency"
          defaultValue={initial?.earnedLeaveFrequency ?? ""}
          className="h-10 w-full rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
        >
          <option value="">—</option>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Half-Yearly">Half-Yearly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </Field>
      <Field
        label="Allocate on"
        htmlFor="allocate_on_day"
        hint="Which calendar day inside the frequency window credits the balance."
      >
        <select
          id="allocate_on_day"
          name="allocate_on_day"
          defaultValue={initial?.allocateOnDay ?? ""}
          className="h-10 w-full rounded-md border border-hairline bg-white px-2 text-sm focus-ring"
        >
          <option value="">—</option>
          <option value="Date of Joining">Date of Joining</option>
          <option value="First Day">First Day (of month/quarter)</option>
          <option value="Last Day">Last Day (of month/quarter)</option>
        </select>
      </Field>
      <Field
        label="Rounding"
        htmlFor="rounding"
        hint="0.5 or 1. Rounds fractional accruals to the nearest step."
      >
        <TextInput
          id="rounding"
          name="rounding"
          type="number"
          step={0.5}
          min={0}
          defaultValue={initial?.rounding ?? 0.5}
        />
      </Field>
      <Field
        label="Expire carry-forwarded leaves after (days)"
        htmlFor="expire_carry_forwarded_leaves_after_days"
        hint="Only relevant when carry-forward is on. 0 = never expires."
      >
        <TextInput
          id="expire_carry_forwarded_leaves_after_days"
          name="expire_carry_forwarded_leaves_after_days"
          type="number"
          min={0}
          defaultValue={initial?.expireCarryForwardedLeavesAfterDays ?? 0}
        />
      </Field>
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
