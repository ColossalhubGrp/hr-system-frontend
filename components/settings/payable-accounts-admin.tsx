"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  createPayableAccountAction,
  deletePayableAccountAction,
  type FormState,
} from "@/app/(workspace)/settings/payable-accounts/actions";
import type { PayableAccountRow } from "@/lib/frappe/payable-accounts";

const EMPTY: FormState = {};

export function PayableAccountsAdmin({
  initial,
  companies,
  activeCompany,
  canManage,
}: {
  initial: PayableAccountRow[];
  companies: string[];
  activeCompany: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<PayableAccountRow[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const router = useRouter();

  useEffect(() => setRows(initial), [initial]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Company:
          <select
            value={activeCompany}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set("company", e.target.value);
              router.push(`/settings/payable-accounts?${params.toString()}`);
            }}
            className="h-8 rounded-chip border border-hairline bg-surface px-2 text-sm text-foreground"
          >
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {canManage && (
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New payable account
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account name</TableHead>
            <TableHead className="hidden md:table-cell">Number</TableHead>
            <TableHead className="hidden lg:table-cell">Parent</TableHead>
            <TableHead className="text-muted-foreground">Full ID</TableHead>
            {canManage && <TableHead className="w-16 text-right" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 5 : 4}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No payable accounts on {activeCompany}. Add one above so the
                Expense Claim form has something to select.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.accountName}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {r.accountNumber ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {r.parentAccount ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.name}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <DeleteButton name={r.name} label={r.accountName} />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        company={activeCompany}
        onSaved={() => setOpenCreate(false)}
      />
    </>
  );
}

function DeleteButton({ name, label }: { name: string; label: string }) {
  return (
    <ConfirmDialog
      title={`Delete "${label}"?`}
      description="Only accounts with no GL entries can be deleted. If the account has ever been used on an Expense Claim or Journal Entry, Frappe will refuse."
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const r = await deletePayableAccountAction(name);
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

function CreateDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: string;
  onSaved: () => void;
}) {
  const [state, dispatch] = useFormState(createPayableAccountAction, EMPTY);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    else if (state.created) {
      toast.success(`Added "${state.created}".`);
      onSaved();
    }
  }, [state, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New payable account</DialogTitle>
          <DialogDescription>
            A leaf Liability account on <b>{company}</b>. Slots under the
            company&apos;s existing Payables group (created automatically if
            missing).
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch} className="flex flex-col gap-3 pt-2">
          <input type="hidden" name="company" value={company} />
          <Field
            label="Account name"
            htmlFor="account_name"
            required
            error={state.fieldErrors?.account_name}
          >
            <TextInput
              id="account_name"
              name="account_name"
              placeholder="e.g. Employee Payables"
              autoFocus
              invalid={Boolean(state.fieldErrors?.account_name)}
            />
          </Field>
          <Field
            label="Account number"
            htmlFor="account_number"
            hint="Optional, used for reporting."
          >
            <TextInput
              id="account_number"
              name="account_number"
              placeholder="e.g. 2101"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? "Adding…" : "Add account"}
    </Button>
  );
}
