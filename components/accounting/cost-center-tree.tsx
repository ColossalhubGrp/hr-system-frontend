"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Folder, Building2, Ban, Pencil, Trash2,
  Plus, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import type { CostCenterNode } from "@/lib/frappe/cost-centers";
import {
  AddCostCenterDialog,
  type ParentOption,
} from "@/app/(workspace)/accounting/cost-centers/add-cost-center-dialog";
import {
  updateCostCenterAction,
  setCostCenterDisabledAction,
  smartDeleteCostCenterAction,
} from "@/app/(workspace)/accounting/cost-centers/actions";
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
 * Chart of Cost Centers — recursive expandable tree with an ERPNext-
 * style hover action bar on every row:
 *
 *   Groups : [Edit · Add child · Disable/Enable · Delete]
 *   Leaves : [Edit · Disable/Enable · Delete]
 *
 * Delete uses a smart check server-side: if the row has children OR GL
 * postings referencing it, it's disabled (history preserved); otherwise
 * it's hard-deleted. The modal explains both outcomes.
 */
export function CostCenterTree({
  nodes, company, parents,
}: {
  nodes: CostCenterNode[]; company: string; parents: ParentOption[];
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
  node: CostCenterNode;
  company: string;
  parents: ParentOption[];
  initiallyOpen?: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(!!initiallyOpen && depth < 2);
  const hasChildren = node.children.length > 0;
  const Icon = node.isGroup ? Folder : Building2;

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
          <span className={cn("truncate text-sm font-semibold", node.disabled ? "text-muted-foreground line-through" : "text-foreground")}>
            {node.costCenterName}
          </span>
        ) : (
          <Link
            href={`/accounting/cost-centers/${encodeURIComponent(node.name)}?company=${encodeURIComponent(company)}` as Route}
            className={cn("truncate text-sm hover:text-primary hover:underline", node.disabled ? "text-muted-foreground line-through" : "text-foreground")}
          >
            {node.costCenterName}
          </Link>
        )}

        <RowActions node={node} company={company} parents={parents} />

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {node.disabled && <Ban className="h-3 w-3 text-fall" aria-label="Disabled" />}
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{node.name}</span>
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

/* ─── Inline hover-action bar ─────────────────────────────────── */

function RowActions({
  node, company, parents,
}: {
  node: CostCenterNode; company: string; parents: ParentOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggleDisabled() {
    start(async () => {
      const res = await setCostCenterDisabledAction(node.name, !node.disabled);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <div className="ml-2 hidden items-center gap-0.5 opacity-0 transition group-hover:flex group-hover:opacity-100">
      <PillBtn label="Edit" icon={Pencil} onClick={() => setEditOpen(true)} />
      {node.isGroup && (
        <AddCostCenterDialog
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
      <PillBtn
        label={node.disabled ? "Enable" : "Disable"}
        icon={node.disabled ? CheckCircle2 : Ban}
        onClick={toggleDisabled}
        disabled={pending}
      />
      <PillBtn label="Delete" icon={Trash2} tone="destructive" onClick={() => setDelOpen(true)} />

      <EditDialog node={node} open={editOpen} setOpen={setEditOpen} />
      <DeleteDialog node={node} open={delOpen} setOpen={setDelOpen} />
    </div>
  );
}

function PillBtn({
  label, onClick, icon: Icon, tone = "default", disabled,
}: {
  label: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "destructive";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-semibold disabled:opacity-50",
        tone === "destructive" ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

/* ─── Edit dialog ─────────────────────────────────────────────── */

function EditDialog({
  node, open, setOpen,
}: {
  node: CostCenterNode; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(node.costCenterName);
  const [isGroup, setIsGroup] = useState(node.isGroup);
  const [disabled, setDisabled] = useState(node.disabled);

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateCostCenterAction(node.name, {
        costCenterName: name,
        isGroup,
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
          <DialogTitle>Edit cost center</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-foreground">{node.name}</span>
            {node.parent ? <> · under {node.parent}</> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </Field>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            This is a group (other cost centers can sit under it)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Disabled (hidden from new postings)
          </label>
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
            onClick={() => setOpen(false)}
            disabled={pending}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Smart-delete confirmation ───────────────────────────────── */

function DeleteDialog({
  node, open, setOpen,
}: {
  node: CostCenterNode; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await smartDeleteCostCenterAction(node.name);
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
          <AlertDialogTitle>Delete this cost center?</AlertDialogTitle>
          <AlertDialogDescription>
            If it has child cost centers or has been posted to, it&apos;ll be
            <strong> disabled</strong> instead of deleted — accounting history
            stays intact. Only an empty cost center with zero postings can
            be removed outright.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); run(); }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Checking…" : "Delete (or disable)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Field({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
