"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Building,
  ChevronRight,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
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
import {
  employeeOptions,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import { SelectInput as _select } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { getDepartmentAdmin } from "@/lib/frappe/departments-admin";
import type {
  DepartmentDetail,
  DepartmentRow,
  ParentOption,
} from "@/lib/frappe/departments-admin";
import {
  deleteDepartmentAction,
  saveDepartmentAction,
  type DepartmentClientInput,
} from "@/app/(workspace)/settings/departments/actions";
// The SelectInput duplicate import silence a lint; drop the alias by
// using it directly. (Kept explicit above so the intent is obvious.)
void _select;

type CompanyOption = { name: string; label: string };

export function DepartmentsAdmin({
  initial,
  companies,
  parents,
  directory,
  canManage,
}: {
  initial: DepartmentRow[];
  companies: CompanyOption[];
  parents: ParentOption[];
  directory: EmployeeDirectoryEntry[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState<DepartmentRow[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  useEffect(() => setRows(initial), [initial]);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {rows.length === 0
            ? "No departments yet."
            : `${rows.length} department${rows.length === 1 ? "" : "s"}.`}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add department
          </Button>
        )}
      </header>

      <div className="rounded-card border border-hairline overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Department</TableHead>
              <TableHead className="px-5">Company</TableHead>
              <TableHead className="px-5">Parent</TableHead>
              <TableHead className="px-5">Approvers (L / E / S)</TableHead>
              <TableHead className="px-5 text-right">
                {canManage ? "Actions" : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Add your first department to start assigning approvers.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d) => (
                <TableRow key={d.name} className="align-middle">
                  <TableCell className="px-5">
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-ash-500" />
                      <span className="font-medium text-ink-800">
                        {d.department_name}
                      </span>
                      {d.is_group && (
                        <span className="rounded-chip bg-canvas px-1.5 py-0.5 text-[10px] uppercase text-ash-500">
                          Group
                        </span>
                      )}
                      {d.disabled && (
                        <span className="rounded-chip bg-rose-50 px-1.5 py-0.5 text-[10px] uppercase text-rose-700">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.name}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 text-sm text-ink-700">
                    {d.company ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 text-sm text-ink-700">
                    {d.parent_department ?? "—"}
                  </TableCell>
                  <TableCell className="px-5 text-sm text-ink-700">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-ash-500" />
                      {d.leave_approver_count} · {d.expense_approver_count} ·{" "}
                      {d.shift_request_approver_count}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 text-right">
                    {canManage ? (
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingName(d.name)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDialog
                          title={`Delete "${d.department_name}"?`}
                          description="Frappe refuses this if employees, sub-departments or leave applications still reference it — you'll see exactly what's blocking it."
                          confirmLabel="Delete"
                          destructive
                          onConfirm={async () => {
                            const res = await deleteDepartmentAction(d.name);
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            setRows((prev) =>
                              prev.filter((r) => r.name !== d.name),
                            );
                            toast.success(`Deleted ${d.department_name}.`);
                          }}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmDialog>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <>
          <DepartmentDialog
            open={openCreate}
            onOpenChange={setOpenCreate}
            mode="create"
            companies={companies}
            parents={parents}
            directory={directory}
            onSaved={(row) => {
              setRows((prev) => [...prev, rowFromDetail(row)]);
              setOpenCreate(false);
              toast.success(`Added ${row.department_name}.`);
            }}
          />
          <DepartmentDialog
            open={editingName !== null}
            onOpenChange={(v) => {
              if (!v) setEditingName(null);
            }}
            mode="edit"
            editingName={editingName}
            companies={companies}
            parents={parents}
            directory={directory}
            onSaved={(row) => {
              setRows((prev) =>
                prev.map((r) => (r.name === row.name ? rowFromDetail(row) : r)),
              );
              setEditingName(null);
              toast.success(`Saved ${row.department_name}.`);
            }}
          />
        </>
      )}
    </section>
  );
}

function rowFromDetail(d: DepartmentDetail): DepartmentRow {
  return {
    name: d.name,
    department_name: d.department_name,
    parent_department: d.parent_department,
    company: d.company,
    is_group: d.is_group,
    disabled: d.disabled,
    payroll_cost_center: d.payroll_cost_center,
    leave_block_list: d.leave_block_list,
    leave_approver_count: d.leave_approvers.length,
    expense_approver_count: d.expense_approvers.length,
    shift_request_approver_count: d.shift_request_approver.length,
  };
}

// -----------------------------------------------------------------------
// Create + Edit dialog
// -----------------------------------------------------------------------

type Mode = "create" | "edit";

function DepartmentDialog({
  open,
  onOpenChange,
  mode,
  editingName,
  companies,
  parents,
  directory,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  editingName?: string | null;
  companies: CompanyOption[];
  parents: ParentOption[];
  directory: EmployeeDirectoryEntry[];
  onSaved: (row: DepartmentDetail) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<DepartmentDetail | null>(null);

  // Fetch on open for edit mode; reset to empty for create mode.
  useEffect(() => {
    if (!open) {
      setDetail(null);
      return;
    }
    if (mode === "create") {
      setDetail({
        name: "",
        department_name: "",
        parent_department: null,
        company: companies[0]?.name ?? "",
        is_group: false,
        disabled: false,
        payroll_cost_center: null,
        leave_block_list: null,
        leave_approvers: [],
        expense_approvers: [],
        shift_request_approver: [],
      });
      return;
    }
    if (mode === "edit" && editingName) {
      setLoading(true);
      getDepartmentAdmin(editingName)
        .then((d) => setDetail(d))
        .catch((err) => {
          toast.error(err?.message ?? "Failed to load department.");
          onOpenChange(false);
        })
        .finally(() => setLoading(false));
    }
  }, [open, mode, editingName, companies, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            {mode === "create" ? "New department" : "Edit department"}
          </DialogTitle>
          <DialogDescription>
            Approvers set here are the fallback the Employee form
            inherits when its own approver fields are left blank.
          </DialogDescription>
        </DialogHeader>
        {loading || !detail ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <DepartmentForm
            key={detail.name || "new"}
            initial={detail}
            companies={companies}
            parents={parents}
            directory={directory}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DepartmentForm({
  initial,
  companies,
  parents,
  directory,
  onCancel,
  onSaved,
}: {
  initial: DepartmentDetail;
  companies: CompanyOption[];
  parents: ParentOption[];
  directory: EmployeeDirectoryEntry[];
  onCancel: () => void;
  onSaved: (row: DepartmentDetail) => void;
}) {
  const [name, setName] = useState(initial.department_name);
  const [company, setCompany] = useState(initial.company ?? "");
  const [parent, setParent] = useState(initial.parent_department ?? "");
  const [isGroup, setIsGroup] = useState(initial.is_group);
  const [disabled, setDisabled] = useState(initial.disabled);
  const [leave, setLeave] = useState<string[]>(
    initial.leave_approvers.map((a) => approverToEmployeeId(a, directory)),
  );
  const [expense, setExpense] = useState<string[]>(
    initial.expense_approvers.map((a) => approverToEmployeeId(a, directory)),
  );
  const [shift, setShift] = useState<string[]>(
    initial.shift_request_approver.map((a) =>
      approverToEmployeeId(a, directory),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});
    const payload: DepartmentClientInput = {
      department_name: name.trim(),
      company: company.trim(),
      parent_department: parent || null,
      is_group: isGroup,
      disabled,
      payroll_cost_center: initial.payroll_cost_center,
      leave_block_list: initial.leave_block_list,
      leave_approvers: leave.filter(Boolean),
      expense_approvers: expense.filter(Boolean),
      shift_request_approver: shift.filter(Boolean),
    };
    startTransition(async () => {
      const res = await saveDepartmentAction(
        initial.name || null,
        payload,
      );
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      onSaved(res.row);
    });
  }

  const parentOptions = parents
    // Prevent picking self as parent when editing.
    .filter((p) => p.name !== initial.name)
    .map((p) => ({
      value: p.name,
      label: `${p.department_name}${p.company ? ` (${p.company})` : ""}`,
    }));

  return (
    <div className="flex flex-col gap-4 pt-2 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Department name"
          htmlFor="department_name"
          required
          error={fieldErrors.department_name}
        >
          <TextInput
            id="department_name"
            name="department_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(fieldErrors.department_name)}
            autoFocus
          />
        </Field>
        <Field
          label="Company"
          htmlFor="company"
          required
          error={fieldErrors.company}
        >
          <SelectInput
            id="company"
            name="company"
            options={companies.map((c) => ({ value: c.name, label: c.label }))}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="— pick a company —"
            invalid={Boolean(fieldErrors.company)}
          />
        </Field>
        <Field
          label="Parent department"
          htmlFor="parent_department"
          hint="Leaves this at the top level when blank."
        >
          <SelectInput
            id="parent_department"
            name="parent_department"
            options={parentOptions}
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            placeholder="— top level —"
          />
        </Field>
        <div className="flex flex-col gap-2 pt-6">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
            />
            Group department (can have sub-departments)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Disabled (hide from pickers)
          </label>
        </div>
      </div>

      <ApproverListEditor
        label="Leave approvers"
        hint="Anyone here can approve leave for this department when the employee's own Leave approver is blank. The first row is the default approver."
        rows={leave}
        setRows={setLeave}
        directory={directory}
      />
      <ApproverListEditor
        label="Expense approvers"
        hint="Fallback approvers for expense claims. The first row is the default."
        rows={expense}
        setRows={setExpense}
        directory={directory}
      />
      <ApproverListEditor
        label="Shift request approvers"
        hint="Fallback approvers for shift-change requests. The first row is the default."
        rows={shift}
        setRows={setShift}
        directory={directory}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>Save department</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// -----------------------------------------------------------------------
// Approver list editor — reused for the three tables
// -----------------------------------------------------------------------

function ApproverListEditor({
  label,
  hint,
  rows,
  setRows,
  directory,
}: {
  label: string;
  hint: string;
  rows: string[];
  setRows: (rows: string[]) => void;
  directory: EmployeeDirectoryEntry[];
}) {
  const [open, setOpen] = useState(rows.length > 0);
  return (
    <div className="rounded-card border border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {rows.length === 0
              ? "No fallback set yet."
              : `${rows.length} row${rows.length === 1 ? "" : "s"} — first is the default.`}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-hairline p-4">
          <p className="text-xs text-muted-foreground">{hint}</p>
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No approvers yet — add one below.
            </p>
          )}
          {rows.map((employeeId, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted-foreground">
                {i === 0 ? "★" : `#${i + 1}`}
              </span>
              <SelectInput
                id={`${label}-row-${i}`}
                name={`${label}-row-${i}`}
                options={employeeOptions(directory, employeeId)}
                value={employeeId}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = e.target.value;
                  setRows(next);
                }}
                placeholder="— pick employee —"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows([...rows, ""])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add approver
          </Button>
        </div>
      )}
    </div>
  );
}

/** Reverse-map an approver's user_id (email) back to an Employee id
 *  so the picker pre-selects the right row. Falls back to the raw
 *  user_id (which employeeOptions preserves via ensureValue) when
 *  no linked Employee exists — e.g. Administrator, ex-employees. */
function approverToEmployeeId(
  a: { user_id: string | null; display: string | null },
  directory: EmployeeDirectoryEntry[],
): string {
  if (!a.user_id) return "";
  const match = directory.find((e) => e.user_id === a.user_id);
  return match?.id ?? a.user_id;
}
