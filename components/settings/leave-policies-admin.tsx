"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FolderCog,
  Loader2,
  Pencil,
  Plus,
  Send,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field, SelectInput, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  bulkAllocateAction,
  createLeavePolicyAction,
  deleteLeavePolicyAction,
  updateLeavePolicyAction,
} from "@/app/(workspace)/settings/leave-policies/actions";
import type {
  LeavePolicyDetail,
  LeavePolicyRow,
} from "@/lib/frappe/leave-policies";

export function LeavePoliciesAdmin({
  initial,
  leaveTypeOptions,
  companyOptions,
  canManage,
}: {
  initial: LeavePolicyRow[];
  leaveTypeOptions: string[];
  companyOptions: string[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState<LeavePolicyRow[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<LeavePolicyRow | null>(null);
  const [assigning, setAssigning] = useState<LeavePolicyRow | null>(null);

  useEffect(() => setRows(initial), [initial]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <p className="text-xs text-muted-foreground">
          {canManage
            ? "Bundle leave types + per-year day counts into a policy, then Assign to Employees at year start to pre-fill everyone's balances."
            : "Read-only view. HR Director / Manager can manage policies."}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New policy
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Policy</TableHead>
            <TableHead>Leave types</TableHead>
            <TableHead className="w-24 text-right">Total days / yr</TableHead>
            {canManage && <TableHead className="w-40 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 4 : 3}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No leave policies yet.
                {canManage && (
                  <>
                    {" "}
                    Click <b>New policy</b> above.
                  </>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <PolicyRow
                key={r.name}
                row={r}
                canManage={canManage}
                onEdit={() => setEditing(r)}
                onAssign={() => setAssigning(r)}
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
            leaveTypeOptions={leaveTypeOptions}
            onCreated={(created) => {
              setRows((prev) =>
                [...prev, created].sort((a, b) => a.title.localeCompare(b.title)),
              );
              setOpenCreate(false);
            }}
          />
          <EditDialog
            editing={editing}
            leaveTypeOptions={leaveTypeOptions}
            onOpenChange={(v) => {
              if (!v) setEditing(null);
            }}
            onSaved={(updated, originalName) => {
              setRows((prev) =>
                prev
                  .map((x) => (x.name === originalName ? updated : x))
                  .sort((a, b) => a.title.localeCompare(b.title)),
              );
              setEditing(null);
            }}
          />
          <AssignDialog
            policy={assigning}
            companyOptions={companyOptions}
            onOpenChange={(v) => {
              if (!v) setAssigning(null);
            }}
          />
        </>
      )}
    </>
  );
}

// ── Row ───────────────────────────────────────────────────────────────

function PolicyRow({
  row,
  canManage,
  onEdit,
  onAssign,
  onRemoved,
}: {
  row: LeavePolicyRow;
  canManage: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onRemoved: () => void;
}) {
  const [removing, startRemove] = useTransition();

  const remove = async () => {
    const res = await deleteLeavePolicyAction(row.name);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Deleted "${row.title}".`);
    onRemoved();
  };
  const runRemove = () =>
    new Promise<void>((resolve) => {
      startRemove(async () => {
        await remove();
        resolve();
      });
    });

  return (
    <TableRow>
      <TableCell className="align-top font-medium">{row.title}</TableCell>
      <TableCell className="align-top">
        {row.details.length === 0 ? (
          <span className="text-xs text-muted-foreground">Empty</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.details.map((d) => (
              <span
                key={d.leaveType}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {d.leaveType}{" "}
                <b className="text-foreground">{d.annualAllocation}d</b>
              </span>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-top text-right tabular-nums">
        {row.totalDays}
      </TableCell>
      {canManage && (
        <TableCell className="text-right align-top">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onAssign}
              className="gap-1"
              title="Bulk-allocate to employees"
              disabled={row.details.length === 0}
            >
              <Users className="h-3.5 w-3.5" />
              Assign
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              title="Edit policy"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmDialog
              title={`Delete "${row.title}"?`}
              description="Existing Leave Allocations that were created from this policy stay intact."
              confirmLabel="Delete"
              destructive
              onConfirm={runRemove}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={removing}
                className="text-muted-foreground hover:text-destructive"
                title="Delete policy"
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

// ── Create ────────────────────────────────────────────────────────────

function CreateDialog({
  open,
  onOpenChange,
  leaveTypeOptions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypeOptions: string[];
  onCreated: (row: LeavePolicyRow) => void;
}) {
  const [saving, startSave] = useTransition();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState<LeavePolicyDetail[]>([]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDetails([]);
    }
  }, [open]);

  const submit = () => {
    startSave(async () => {
      const res = await createLeavePolicyAction({ title, details });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.created) {
        toast.success(`Added "${res.created.title}".`);
        onCreated(res.created);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderCog className="h-4 w-4" />
            New leave policy
          </DialogTitle>
          <DialogDescription>
            Pick the leave types this policy grants and how many days each is
            worth per year.
          </DialogDescription>
        </DialogHeader>
        <PolicyFields
          title={title}
          onTitleChange={setTitle}
          details={details}
          onDetailsChange={setDetails}
          leaveTypeOptions={leaveTypeOptions}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving ? "Adding…" : "Add policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────

function EditDialog({
  editing,
  onOpenChange,
  leaveTypeOptions,
  onSaved,
}: {
  editing: LeavePolicyRow | null;
  onOpenChange: (v: boolean) => void;
  leaveTypeOptions: string[];
  onSaved: (updated: LeavePolicyRow, originalName: string) => void;
}) {
  const open = editing !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit leave policy
          </DialogTitle>
          <DialogDescription>
            Changes apply to future allocations. Balances already assigned
            from this policy stay as-is until you re-assign.
          </DialogDescription>
        </DialogHeader>
        {editing && (
          <EditInner
            key={editing.name}
            row={editing}
            leaveTypeOptions={leaveTypeOptions}
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
  leaveTypeOptions,
  onCancel,
  onSaved,
}: {
  row: LeavePolicyRow;
  leaveTypeOptions: string[];
  onCancel: () => void;
  onSaved: (updated: LeavePolicyRow, originalName: string) => void;
}) {
  const [saving, startSave] = useTransition();
  const [title, setTitle] = useState(row.title);
  const [details, setDetails] = useState<LeavePolicyDetail[]>(row.details);

  const submit = () => {
    startSave(async () => {
      const res = await updateLeavePolicyAction(row.name, { title, details });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.updated && res.originalName) {
        toast.success(`Updated "${res.updated.title}".`);
        onSaved(res.updated, res.originalName);
      }
    });
  };

  return (
    <>
      <PolicyFields
        title={title}
        onTitleChange={setTitle}
        details={details}
        onDetailsChange={setDetails}
        leaveTypeOptions={leaveTypeOptions}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Shared form: title + child-table editor ───────────────────────────

function PolicyFields({
  title,
  onTitleChange,
  details,
  onDetailsChange,
  leaveTypeOptions,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  details: LeavePolicyDetail[];
  onDetailsChange: (v: LeavePolicyDetail[]) => void;
  leaveTypeOptions: string[];
}) {
  const addRow = () => {
    // Skip types already in the policy so users don't accidentally
    // duplicate — the schema rejects duplicates anyway, but it's
    // cleaner to only offer unused options.
    const used = new Set(details.map((d) => d.leaveType));
    const next = leaveTypeOptions.find((t) => !used.has(t));
    if (!next) {
      toast.info("Every configured leave type is already in this policy.");
      return;
    }
    onDetailsChange([...details, { leaveType: next, annualAllocation: 15 }]);
  };

  const updateRow = (idx: number, patch: Partial<LeavePolicyDetail>) => {
    onDetailsChange(
      details.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );
  };

  const removeRow = (idx: number) => {
    onDetailsChange(details.filter((_, i) => i !== idx));
  };

  const total = details.reduce((s, d) => s + Number(d.annualAllocation || 0), 0);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <Field label="Policy name" htmlFor="policy_title" required wide>
        <TextInput
          id="policy_title"
          name="title"
          placeholder="e.g. Standard Employee"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Leave types in this policy
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addRow}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add row
          </Button>
        </div>
        {leaveTypeOptions.length === 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs text-amber-900">
            No leave types configured yet. Add some under Settings → Leave
            types first, then come back here to build a policy.
          </p>
        )}
        {details.length === 0 ? (
          <p className="rounded-md border border-dashed border-input px-3 py-6 text-center text-xs text-muted-foreground">
            No leave types added yet. Click <b>Add row</b> above.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-input">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Leave type</th>
                  <th className="w-32 px-3 py-2">Days / year</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {details.map((d, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-input first:border-t-0"
                  >
                    <td className="px-3 py-2">
                      <SelectInput
                        name={`detail_type_${idx}`}
                        options={leaveTypeOptions}
                        value={d.leaveType}
                        onChange={(e) =>
                          updateRow(idx, { leaveType: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <TextInput
                        type="number"
                        min={0}
                        step={0.5}
                        value={d.annualAllocation}
                        onChange={(e) =>
                          updateRow(idx, {
                            annualAllocation: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRow(idx)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remove row"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-input bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total per year
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {total} days
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assign (bulk allocate) ────────────────────────────────────────────

function AssignDialog({
  policy,
  companyOptions,
  onOpenChange,
}: {
  policy: LeavePolicyRow | null;
  companyOptions: string[];
  onOpenChange: (v: boolean) => void;
}) {
  const open = policy !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assign policy to employees
          </DialogTitle>
          <DialogDescription>
            Creates or updates Leave Allocations for every active employee
            (optionally filtered) using this policy's day counts.
          </DialogDescription>
        </DialogHeader>
        {policy && (
          <AssignInner
            key={policy.name}
            policy={policy}
            companyOptions={companyOptions}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignInner({
  policy,
  companyOptions,
  onCancel,
  onDone,
}: {
  policy: LeavePolicyRow;
  companyOptions: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [running, startRun] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const [fromDate, setFromDate] = useState(`${year}-01-01`);
  const [toDate, setToDate] = useState(`${year}-12-31`);
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");

  const submit = () => {
    startRun(async () => {
      const res = await bulkAllocateAction({
        policy: policy.name,
        from_date: fromDate,
        to_date: toDate,
        company: company || undefined,
        department: department || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { employees, created, updated, unchanged, errors } = res.summary;
      const parts: string[] = [];
      if (created) parts.push(`${created} created`);
      if (updated) parts.push(`${updated} updated`);
      if (unchanged) parts.push(`${unchanged} unchanged`);
      const detail = parts.length ? parts.join(" · ") : "nothing to do";
      if (errors.length) {
        toast.warning(
          `Assigned to ${employees} employee${employees === 1 ? "" : "s"}, ${errors.length} row${errors.length === 1 ? "" : "s"} failed.`,
          { description: `${detail}. Check server logs for details.` },
        );
      } else {
        toast.success(
          `Assigned "${policy.title}" to ${employees} employee${employees === 1 ? "" : "s"}.`,
          { description: detail },
        );
      }
      onDone();
    });
  };

  return (
    <>
      <div className="grid gap-4 pt-2 sm:grid-cols-2">
        <div className="col-span-full rounded-md border border-input bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            <b className="text-foreground">{policy.title}</b> —{" "}
            {policy.details.length} leave type
            {policy.details.length === 1 ? "" : "s"}, {policy.totalDays} total
            days per employee per year.
          </p>
        </div>
        <Field
          label="Effective from"
          htmlFor="from_date"
          required
          hint="Usually Jan 1 of the fiscal year."
        >
          <TextInput
            id="from_date"
            name="from_date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Field>
        <Field
          label="Effective to"
          htmlFor="to_date"
          required
          hint="Usually Dec 31 of the fiscal year."
        >
          <TextInput
            id="to_date"
            name="to_date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Field>
        <Field
          label="Company (optional)"
          htmlFor="company"
          hint="Leave blank to allocate across every company."
        >
          <SelectInput
            id="company"
            name="company"
            options={companyOptions}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="— all companies —"
          />
        </Field>
        <Field
          label="Department (optional)"
          htmlFor="department"
          hint="Free text — matches Employee.department exactly."
        >
          <TextInput
            id="department"
            name="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="— all departments —"
          />
        </Field>
      </div>
      <div className="rounded-md border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs text-amber-900">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This creates a fresh Leave Allocation per employee per leave type.
            Existing allocations for the same window that don't match the
            policy's day count get cancelled and replaced.
          </span>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {running ? "Allocating…" : "Run allocation"}
        </Button>
      </DialogFooter>
    </>
  );
}
