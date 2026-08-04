"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  CalendarPlus,
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
import { Field, SelectInput, TextInput } from "@/components/employee/form-bits";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  createHolidayListAction,
  deleteHolidayListAction,
  updateHolidayListAction,
  type FormState,
} from "@/app/(workspace)/settings/holiday-lists/actions";

type Row = {
  name: string;
  fromDate: string | null;
  toDate: string | null;
  weeklyOff: string | null;
  totalHolidays: number;
};
const EMPTY: FormState = {};
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function HolidayListsAdmin({
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
            ? "Assign a list as a Company or Employee default so leave, attendance and payroll pick it up."
            : "Read-only view. HR Director / Manager can add or edit."}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New holiday list
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Total holidays</TableHead>
            <TableHead>Weekly off</TableHead>
            {canManage && <TableHead className="w-24 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 6 : 5}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No holiday lists yet.
                {canManage && (
                  <>
                    {" "}
                    Click <b>New holiday list</b> above.
                  </>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <HolidayRow
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
                [...prev, created].sort((a, b) =>
                  (b.fromDate ?? "").localeCompare(a.fromDate ?? ""),
                ),
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
                  .map((x) =>
                    x.name === originalName
                      ? // Preserve the totalHolidays count — the update
                        // action doesn't touch the child table so the
                        // count on the parent is unchanged in DB.
                        { ...updated, totalHolidays: x.totalHolidays }
                      : x,
                  )
                  .sort((a, b) =>
                    (b.fromDate ?? "").localeCompare(a.fromDate ?? ""),
                  ),
              );
              setEditing(null);
            }}
          />
        </>
      )}
    </>
  );
}

function HolidayRow({
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
  const runRemove = () =>
    new Promise<void>((resolve) => {
      startRemove(async () => {
        const res = await deleteHolidayListAction(row.name);
        if (!res.ok) {
          toast.error(res.error);
        } else {
          toast.success(`Deleted "${row.name}".`);
          onRemoved();
        }
        resolve();
      });
    });

  return (
    <TableRow>
      <TableCell className="align-top font-medium">{row.name}</TableCell>
      <TableCell className="align-top text-muted-foreground">
        {row.fromDate ?? "—"}
      </TableCell>
      <TableCell className="align-top text-muted-foreground">
        {row.toDate ?? "—"}
      </TableCell>
      <TableCell className="text-right align-top text-muted-foreground">
        {row.totalHolidays}
      </TableCell>
      <TableCell className="align-top text-muted-foreground">
        {row.weeklyOff ?? "—"}
      </TableCell>
      {canManage && (
        <TableCell className="text-right align-top">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              title="Edit holiday list"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <ConfirmDialog
              title={`Delete "${row.name}"?`}
              description="Companies or employees pointing at this list will need to be repointed manually."
              confirmLabel="Delete"
              destructive
              onConfirm={runRemove}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={removing}
                className="text-muted-foreground hover:text-destructive"
                title="Delete holiday list"
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

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: Row) => void;
}) {
  const [state, dispatch] = useFormState(createHolidayListAction, EMPTY);
  const lastSeen = useRef(state);
  const currentYear = new Date().getFullYear();

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
            <CalendarPlus className="h-4 w-4" />
            New holiday list
          </DialogTitle>
          <DialogDescription>
            Set the calendar range and (optionally) a weekly off. Individual
            public-holiday dates are added after the list is created.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-4 pt-2">
          <Field
            label="Name"
            htmlFor="holiday_list_name"
            required
            error={state.fieldErrors?.holiday_list_name}
            wide
          >
            <TextInput
              id="holiday_list_name"
              name="holiday_list_name"
              placeholder={`Rivers Inc ${currentYear}`}
              invalid={Boolean(state.fieldErrors?.holiday_list_name)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="From date"
              htmlFor="from_date"
              required
              error={state.fieldErrors?.from_date}
            >
              <TextInput
                id="from_date"
                name="from_date"
                type="date"
                defaultValue={`${currentYear}-01-01`}
                invalid={Boolean(state.fieldErrors?.from_date)}
              />
            </Field>
            <Field
              label="To date"
              htmlFor="to_date"
              required
              error={state.fieldErrors?.to_date}
            >
              <TextInput
                id="to_date"
                name="to_date"
                type="date"
                defaultValue={`${currentYear}-12-31`}
                invalid={Boolean(state.fieldErrors?.to_date)}
              />
            </Field>
          </div>
          <Field
            label="Weekly off"
            htmlFor="weekly_off"
            hint="Optional. Once set, the day of the week can be added as recurring off days on the list."
            wide
          >
            <SelectInput
              id="weekly_off"
              name="weekly_off"
              options={WEEKDAYS}
              placeholder="— none —"
              defaultValue="Sunday"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton icon="add" label="Create" pendingLabel="Creating…" />
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
            Edit holiday list
          </DialogTitle>
          <DialogDescription>
            Renaming updates the label everywhere the list is referenced going
            forward. Individual holiday dates are unaffected.
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
  const [state, dispatch] = useFormState(updateHolidayListAction, UPDATE_EMPTY);
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
        htmlFor="holiday_list_name"
        required
        error={state.fieldErrors?.holiday_list_name}
        wide
      >
        <TextInput
          id="holiday_list_name"
          name="holiday_list_name"
          defaultValue={row.name}
          invalid={Boolean(state.fieldErrors?.holiday_list_name)}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="From date"
          htmlFor="from_date"
          required
          error={state.fieldErrors?.from_date}
        >
          <TextInput
            id="from_date"
            name="from_date"
            type="date"
            defaultValue={row.fromDate ?? ""}
            invalid={Boolean(state.fieldErrors?.from_date)}
          />
        </Field>
        <Field
          label="To date"
          htmlFor="to_date"
          required
          error={state.fieldErrors?.to_date}
        >
          <TextInput
            id="to_date"
            name="to_date"
            type="date"
            defaultValue={row.toDate ?? ""}
            invalid={Boolean(state.fieldErrors?.to_date)}
          />
        </Field>
      </div>
      <Field label="Weekly off" htmlFor="weekly_off" wide>
        <SelectInput
          id="weekly_off"
          name="weekly_off"
          options={WEEKDAYS}
          placeholder="— none —"
          defaultValue={row.weeklyOff ?? ""}
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
