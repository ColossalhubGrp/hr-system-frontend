"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
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
  deleteTrainingSupplierAction,
  saveTrainingSupplierAction,
  type FormState,
} from "@/app/(workspace)/settings/training-suppliers/actions";
import type { TrainingSupplierRow } from "@/lib/frappe/training-suppliers";

const EMPTY: FormState = {};

export function TrainingSuppliersAdmin({
  initial,
  canManage,
}: {
  initial: TrainingSupplierRow[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState<TrainingSupplierRow[]>(initial);
  const [editing, setEditing] = useState<TrainingSupplierRow | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => setRows(initial), [initial]);

  const onSaved = (name: string) => {
    // Simplest correct behaviour: refresh by asking Next to re-fetch — the
    // server action revalidatePath already fired. The `initial` prop
    // arrives fresh on the next render.
    setOpenCreate(false);
    setEditing(null);
    toast.success(`Saved "${name}".`);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <p className="text-xs text-muted-foreground">
          Lightweight training-supplier registry. Used by Training Programs so
          you can attribute an external training provider without needing the
          ERPNext Buying module.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New supplier
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden md:table-cell">Website</TableHead>
            {canManage && <TableHead className="w-24 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 6 : 5}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No training suppliers on file yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.supplierName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.contactName ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.contactEmail ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.contactPhone ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {r.website ?? "—"}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(r)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteButton name={r.name} label={r.supplierName} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <SupplierDialog
        open={openCreate}
        editing={null}
        onOpenChange={setOpenCreate}
        onSaved={onSaved}
      />
      <SupplierDialog
        open={Boolean(editing)}
        editing={editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={onSaved}
      />
    </>
  );
}

function DeleteButton({ name, label }: { name: string; label: string }) {
  return (
    <ConfirmDialog
      title={`Delete "${label}"?`}
      description="Existing Training Programs that reference this supplier will keep the name string but the link will go stale. This can't be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const r = await deleteTrainingSupplierAction(name);
        if (!r.ok) toast.error(r.error);
        else toast.success(`Deleted "${label}".`);
      }}
    >
      <Button variant="ghost" size="icon" aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </ConfirmDialog>
  );
}

function SupplierDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editing: TrainingSupplierRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: (name: string) => void;
}) {
  const action = saveTrainingSupplierAction.bind(null, editing?.name ?? null);
  const [state, dispatch] = useFormState(action, EMPTY);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    else if (state.savedName) onSaved(state.savedName);
  }, [state, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit supplier" : "New training supplier"}
          </DialogTitle>
          <DialogDescription>
            Kept intentionally light — supplier name plus optional contact info.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-3 pt-2">
          <Field
            label="Supplier name"
            htmlFor="supplier_name"
            required
            error={state.fieldErrors?.supplier_name}
          >
            <TextInput
              id="supplier_name"
              name="supplier_name"
              defaultValue={editing?.supplierName ?? ""}
              placeholder="e.g. Acme Training Institute"
              autoFocus
              invalid={Boolean(state.fieldErrors?.supplier_name)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact name" htmlFor="contact_name">
              <TextInput
                id="contact_name"
                name="contact_name"
                defaultValue={editing?.contactName ?? ""}
              />
            </Field>
            <Field label="Contact email" htmlFor="contact_email">
              <TextInput
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={editing?.contactEmail ?? ""}
              />
            </Field>
            <Field label="Contact phone" htmlFor="contact_phone">
              <TextInput
                id="contact_phone"
                name="contact_phone"
                defaultValue={editing?.contactPhone ?? ""}
              />
            </Field>
            <Field label="Website" htmlFor="website">
              <TextInput
                id="website"
                name="website"
                defaultValue={editing?.website ?? ""}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="notes">
            <TextArea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
              placeholder="Delivery style, cost band, referral notes…"
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton editing={Boolean(editing)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : editing ? "Save changes" : "Add supplier"}
    </Button>
  );
}
