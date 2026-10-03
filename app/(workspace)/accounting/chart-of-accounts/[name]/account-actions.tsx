"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Pencil, Trash2, Ban, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import {
  updateAccountAction, setAccountDisabledAction, smartDeleteAccountAction,
} from "../actions";
import { cn } from "@/lib/cn";

type Account = {
  name: string;
  accountName: string;
  accountType: string | null;
  currency: string | null;
  disabled: boolean;
  parent: string | null;
};

const ACCOUNT_TYPES = [
  "", "Bank", "Cash", "Receivable", "Payable", "Fixed Asset", "Current Asset",
  "Current Liability", "Equity", "Expense Account", "Income Account", "Tax",
  "Stock", "Chargeable", "Cost of Goods Sold", "Depreciation", "Round Off",
  "Temporary",
];

/**
 * Edit + Disable/Enable + Smart-Delete trio for the account detail
 * page. Smart-delete does the GL + children check server-side and
 * falls back to a disable when postings exist — matches the "never
 * orphan the ledger history" rule.
 */
export function AccountActions({ account, backHref }: { account: Account; backHref: string }) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  // Edit form state
  const [name, setName] = useState(account.accountName);
  const [type, setType] = useState(account.accountType ?? "");
  const [currency, setCurrency] = useState(account.currency ?? "");
  const [err, setErr] = useState<string | null>(null);

  function openEdit() {
    setName(account.accountName);
    setType(account.accountType ?? "");
    setCurrency(account.currency ?? "");
    setErr(null);
    setEditOpen(true);
  }

  function saveEdit() {
    setErr(null);
    start(async () => {
      const res = await updateAccountAction(account.name, {
        accountName: name,
        accountType: type || null,
        currency: currency || null,
      });
      if (!res.ok) { setErr(res.error); return; }
      toast.success(res.message);
      setEditOpen(false);
      router.refresh();
    });
  }

  function toggleDisabled() {
    start(async () => {
      const res = await setAccountDisabledAction(account.name, !account.disabled);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(account.disabled ? "Account re-enabled." : "Account disabled.");
      router.refresh();
    });
  }

  function smartDelete() {
    start(async () => {
      const res = await smartDeleteAccountAction(account.name);
      if (!res.ok) { toast.error(res.error); return; }
      // "deleted" → the record is gone, bounce back to the tree.
      // "disabled" → the row stays, refresh in place.
      if (res.action === "deleted") {
        toast.success(res.message);
        router.push(backHref as Route);
      } else {
        toast.message(res.message);
        setDeleteOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={openEdit}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input bg-transparent px-3 text-sm font-semibold hover:bg-muted/40"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={toggleDisabled}
        disabled={pending}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-chip border px-3 text-sm font-semibold disabled:opacity-60",
          account.disabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
      >
        {account.disabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
        {account.disabled ? "Re-enable" : "Disable"}
      </button>
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/40 bg-destructive/5 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => (pending ? null : setEditOpen(o))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              Name / type / currency can be edited any time. Root type (Asset,
              Liability, …) and parent are set once at creation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Account name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </Field>
            <Field label="Account type">
              <select
                value={type}
                onChange={(e) => setType(e.currentTarget.value)}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t || "—"}</option>
                ))}
              </select>
            </Field>
            <Field label="Currency" hint="Blank = company default.">
              <input
                type="text"
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase())}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </Field>
            {err && (
              <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={pending}
              className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={pending || !name.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart-delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              If this account has already been posted to (any General Ledger entry
              references it), it&apos;ll be <strong>disabled</strong> instead so the
              ledger history stays intact — that&apos;s the accounting rule.
              Only accounts with zero postings AND zero children can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); smartDelete(); }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Checking…" : "Delete (or disable)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
