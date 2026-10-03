"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Folder, FileText, Ban, Pencil, Trash2,
  Plus, BookText, Loader2, AlertCircle,
} from "lucide-react";
import type { AccountNode } from "@/lib/frappe/chart-of-accounts";
import type { ParentOption } from "@/app/(workspace)/accounting/chart-of-accounts/add-account-dialog";
import { AddAccountDialog } from "@/app/(workspace)/accounting/chart-of-accounts/add-account-dialog";
import {
  updateAccountAction, smartDeleteAccountAction,
} from "@/app/(workspace)/accounting/chart-of-accounts/actions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";

/**
 * Recursive expandable tree for the Chart of Accounts.
 *
 * Each row shows a hover-only inline toolbar — ERPNext-style — so the
 * common CRUD actions are always one hover away without a navigation
 * detour. Groups get [Edit · Add child · View ledger · Delete]; leaves
 * get [Edit · View ledger · Delete]. The Delete button runs through
 * the same smart-check (disable-vs-delete) as the detail page.
 */
export function AccountTree({
  nodes, company, parents,
}: {
  nodes: AccountNode[]; company: string; parents: ParentOption[];
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((n) => (
        <TreeItem key={n.name} node={n} company={company} parents={parents} initiallyOpen depth={0} />
      ))}
    </ul>
  );
}

function TreeItem({
  node, company, parents, initiallyOpen, depth,
}: {
  node: AccountNode;
  company: string;
  parents: ParentOption[];
  initiallyOpen?: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(!!initiallyOpen && depth < 1);
  const hasChildren = node.children.length > 0;
  const Icon = node.isGroup ? Folder : FileText;

  return (
    <li>
      <div
        className="group flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", node.isGroup ? "text-primary" : "text-muted-foreground")} />
        {node.isGroup ? (
          <span className="truncate text-sm font-semibold text-foreground">{node.accountName}</span>
        ) : (
          <Link
            href={`/accounting/chart-of-accounts/${encodeURIComponent(node.name)}?company=${encodeURIComponent(company)}` as Route}
            className="truncate text-sm text-foreground hover:text-primary hover:underline"
          >
            {node.accountName}
          </Link>
        )}

        {/* Hover-only inline toolbar — the ERPNext-style action bar.
            Hidden by default, fades in on row hover. Right-aligned
            BEFORE the status chips so chips stay in a stable column. */}
        <RowActions
          node={node}
          company={company}
          parents={parents}
        />

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {node.disabled && <Ban className="h-3 w-3 text-fall" aria-label="Disabled" />}
          {node.accountType && !node.isGroup && (
            <span className="hidden md:inline">{node.accountType}</span>
          )}
          {node.currency && (
            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
              {node.currency}
            </span>
          )}
          <BalanceChip node={node} />
        </div>
      </div>

      {hasChildren && open && (
        <ul className="flex flex-col">
          {node.children.map((c) => (
            <TreeItem key={c.name} node={c} company={company} parents={parents} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────── */

function RowActions({
  node, company, parents,
}: {
  node: AccountNode; company: string; parents: ParentOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const ledgerHref =
    `/accounting/reports/general-ledger?account=${encodeURIComponent(node.name)}&company=${encodeURIComponent(company)}`;

  return (
    <div className="ml-2 hidden items-center gap-0.5 opacity-0 transition group-hover:flex group-hover:opacity-100">
      <PillBtn
        label="Edit"
        onClick={() => setEditOpen(true)}
        icon={Pencil}
      />
      {node.isGroup && (
        <AddAccountDialog
          company={company}
          parents={parents}
          presetParent={node.name}
          trigger={
            <span>
              <PillBtn label="Add child" icon={Plus} />
            </span>
          }
        />
      )}
      <Link href={ledgerHref as Route}
            className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
            title="Open filtered General Ledger">
        <BookText className="h-3 w-3" />
        Ledger
      </Link>
      <PillBtn
        label="Delete"
        onClick={() => setDelOpen(true)}
        icon={Trash2}
        tone="destructive"
      />

      <EditDialog node={node} open={editOpen} setOpen={setEditOpen} />
      <DeleteDialog node={node} open={delOpen} setOpen={setDelOpen} />
    </div>
  );
}

function PillBtn({
  label, onClick, icon: Icon, tone = "default",
}: {
  label: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-semibold hover:bg-muted/60",
        tone === "destructive" ? "text-destructive hover:bg-destructive/10" : "text-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

/* ────────────── Balance chip (Dr/Cr) ────────────── */

/**
 * Renders the account's balance with the Dr/Cr convention.
 *
 *   Asset / Expense:          positive balance → Dr, negative → Cr
 *   Liability / Equity / Income:  positive balance → Cr, negative → Dr
 *
 * Zero balances fall back to a muted "—". Null balance (no GL rows
 * loaded, or permission denied on GL Entry) collapses the chip.
 */
function BalanceChip({ node }: { node: AccountNode }) {
  if (node.balance === null) return null;
  const bal = node.balance;
  const credit = node.rootType === "Liability" || node.rootType === "Equity" || node.rootType === "Income";
  // Credit-side accounts: credit is positive, so FLIP the sign of
  // `debit − credit` to find the "natural" magnitude.
  const natural = credit ? -bal : bal;
  if (Math.abs(natural) < 0.005) {
    return <span className="text-[10px] text-muted-foreground/60">—</span>;
  }
  const dr = natural >= 0;
  // Natural side (Dr for asset/expense, Cr for liability/equity/income)
  // is the "normal" sign and renders in the brand palette; abnormal
  // (an asset in credit, say) renders in rose so it jumps out.
  const normal = (dr && !credit) || (!dr && credit);
  const toneCls = normal ? "text-foreground" : "text-rose-700";
  const dcCls   = normal ? "bg-primary/10 text-primary" : "bg-rose-100 text-rose-700";
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] tabular-nums", toneCls)}>
      {fmtMoney(Math.abs(natural))}
      <span className={cn("rounded px-1 text-[9px] font-bold uppercase", dcCls)}>
        {dr ? "Dr" : "Cr"}
      </span>
    </span>
  );
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ────────────── Inline Edit dialog ────────────── */

const ACCOUNT_TYPES = [
  "", "Bank", "Cash", "Receivable", "Payable", "Fixed Asset", "Current Asset",
  "Current Liability", "Equity", "Expense Account", "Income Account", "Tax",
  "Stock", "Chargeable", "Cost of Goods Sold", "Depreciation", "Round Off",
  "Temporary",
];

function EditDialog({
  node, open, setOpen,
}: {
  node: AccountNode; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(node.accountName);
  const [number, setNumber] = useState(node.accountNumber ?? "");
  const [type, setType] = useState(node.accountType ?? "");
  const [currency, setCurrency] = useState(node.currency ?? "");
  const [disabled, setDisabled] = useState(node.disabled);

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateAccountAction(node.name, {
        accountName: name,
        accountNumber: number || null,
        accountType: type || null,
        currency: currency || null,
        disabled,
      });
      if (!res.ok) { setErr(res.error); return; }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {node.isGroup ? "group" : "account"}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-foreground">{node.name}</span>
            {node.parent ? <> · under {node.parent}</> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Account name" required>
              <input type="text" value={name} onChange={(e) => setName(e.currentTarget.value)}
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </Field>
            <Field label="Account no." hint="Numeric prefix.">
              <input type="text" value={number} inputMode="numeric" maxLength={16}
                     onChange={(e) => setNumber(e.currentTarget.value)}
                     placeholder="1710"
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </Field>
          </div>
          {!node.isGroup && (
            <Field label="Account type">
              <select value={type} onChange={(e) => setType(e.currentTarget.value)}
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t || "—"}</option>)}
              </select>
            </Field>
          )}
          <Field label="Currency" hint="Blank = company default.">
            <input type="text" value={currency} maxLength={3}
                   onChange={(e) => setCurrency(e.currentTarget.value.toUpperCase())}
                   className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </Field>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={disabled}
                   onChange={(e) => setDisabled(e.currentTarget.checked)}
                   className="h-4 w-4" />
            Disabled (freeze — no new postings allowed, history preserved)
          </label>
          {err && (
            <div className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <button type="button" onClick={() => setOpen(false)} disabled={pending}
                  className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending || !name.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────── Smart-delete dialog ────────────── */

function DeleteDialog({
  node, open, setOpen,
}: {
  node: AccountNode; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await smartDeleteAccountAction(node.name);
      if (!res.ok) { toast.error(res.error); return; }
      if (res.action === "deleted") toast.success(res.message);
      else toast.message(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {node.isGroup ? "group" : "account"} “{node.accountName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Accounts with ledger history (or child accounts) are <strong>disabled</strong>
            {" "}instead of deleted — the postings stay in the books. Only accounts with
            zero postings AND zero children are removed outright.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); run(); }}
                             disabled={pending}
                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pending ? "Checking…" : "Delete (or disable)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
