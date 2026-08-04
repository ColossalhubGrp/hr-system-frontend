"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Loader2,
  MapPin,
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
import { Field, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import {
  createBranchAction,
  deleteBranchAction,
  updateBranchAction,
  type FormState,
} from "@/app/(workspace)/settings/branches/actions";

type Row = { name: string; weeklyLaborBudget: number };
const EMPTY: FormState = {};

export function BranchesAdmin({
  initial,
  canManage,
}: {
  initial: Row[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  useEffect(() => setRows(initial), [initial]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <p className="text-xs text-muted-foreground">
          {canManage
            ? "Assign a branch per Employee on the Overview tab."
            : "Read-only view. HR Director / Manager can add or edit."}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New branch
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Weekly labor budget</TableHead>
            {canManage && <TableHead className="w-24 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 3 : 2}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No branches yet.
                {canManage && (
                  <>
                    {" "}
                    Click <b>New branch</b> above.
                  </>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <BranchRow
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

function BranchRow({
  row,
  canManage,
  onEdit,
  onRemoved,
}: {
  row: Row;
  canManage: boolean;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const [removing, startRemove] = useTransition();
  const remove = () => {
    if (!canManage) return;
    if (
      !confirm(
        `Delete "${row.name}"? Employees assigned to this branch will still reference it by name.`,
      )
    )
      return;
    startRemove(async () => {
      const res = await deleteBranchAction(row.name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Deleted "${row.name}".`);
      onRemoved();
    });
  };

  return (
    <TableRow>
      <TableCell className="align-top font-medium">{row.name}</TableCell>
      <TableCell className="text-right align-top text-muted-foreground">
        {row.weeklyLaborBudget > 0
          ? row.weeklyLaborBudget.toLocaleString()
          : "—"}
      </TableCell>
      {canManage && (
        <TableCell className="text-right align-top">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              title="Edit branch"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={remove}
              disabled={removing}
              className="text-muted-foreground hover:text-destructive"
              title="Delete branch"
            >
              {removing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: Row) => void;
}) {
  const [state, dispatch] = useFormState(createBranchAction, EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    } else if (state.created) {
      toast.success(`Added "${state.created.name}".`);
      onCreated(state.created);
    }
  }, [state, onCreated]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            New branch
          </DialogTitle>
          <DialogDescription>
            Add a business location employees can be assigned to.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-4 pt-2">
          <Field
            label="Name"
            htmlFor="branch"
            required
            error={state.fieldErrors?.branch}
            wide
          >
            <TextInput
              id="branch"
              name="branch"
              placeholder="e.g. Harare Head Office"
              invalid={Boolean(state.fieldErrors?.branch)}
              autoFocus
            />
          </Field>
          <Field
            label="Weekly labor budget"
            htmlFor="weekly_labor_budget"
            hint="Optional. Used by scheduling to cap weekly hours planned at this branch."
            wide
            error={state.fieldErrors?.weekly_labor_budget}
          >
            <TextInput
              id="weekly_labor_budget"
              name="weekly_labor_budget"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder="0"
              invalid={Boolean(state.fieldErrors?.weekly_labor_budget)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton icon="add" label="Add branch" pendingLabel="Adding…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const UPDATE_EMPTY: FormState = {};

function EditDialog({
  editing,
  onOpenChange,
  onSaved,
}: {
  editing: Row | null;
  onOpenChange: (v: boolean) => void;
  onSaved: (updated: Row, originalName: string) => void;
}) {
  const open = editing !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit branch
          </DialogTitle>
          <DialogDescription>
            Renaming updates the label everywhere the branch is referenced
            going forward.
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
  row: Row;
  onCancel: () => void;
  onSaved: (updated: Row, originalName: string) => void;
}) {
  const [state, dispatch] = useFormState(updateBranchAction, UPDATE_EMPTY);
  const lastSeen = useRef(state);

  useEffect(() => {
    if (state === lastSeen.current) return;
    lastSeen.current = state;
    if (state.error) {
      toast.error(state.error, {
        description: state.fieldErrors
          ? "Check the highlighted fields."
          : undefined,
      });
    } else if (state.updated && state.originalName) {
      toast.success(`Updated "${state.updated.name}".`);
      onSaved(state.updated, state.originalName);
    }
  }, [state, onSaved]);

  return (
    <form action={dispatch} className="flex flex-col gap-4 pt-2">
      <input type="hidden" name="original_name" value={row.name} />
      <Field
        label="Name"
        htmlFor="branch"
        required
        error={state.fieldErrors?.branch}
        wide
      >
        <TextInput
          id="branch"
          name="branch"
          defaultValue={row.name}
          invalid={Boolean(state.fieldErrors?.branch)}
          autoFocus
        />
      </Field>
      <Field
        label="Weekly labor budget"
        htmlFor="weekly_labor_budget"
        wide
        error={state.fieldErrors?.weekly_labor_budget}
      >
        <TextInput
          id="weekly_labor_budget"
          name="weekly_labor_budget"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          defaultValue={
            row.weeklyLaborBudget > 0 ? String(row.weeklyLaborBudget) : ""
          }
          invalid={Boolean(state.fieldErrors?.weekly_labor_budget)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton icon="save" label="Save changes" pendingLabel="Saving…" />
      </DialogFooter>
    </form>
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
