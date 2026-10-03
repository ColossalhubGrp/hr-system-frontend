"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
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
  renameItemGroupAction,
  deleteItemGroupAction,
} from "@/app/(workspace)/accounting/items/actions";
import { cn } from "@/lib/cn";

/**
 * One row of the Item Groups grid. Shows the group name with a
 * hover-only inline toolbar: Rename / Delete. Delete is destructive
 * and goes through an AlertDialog; Frappe will refuse the delete if
 * the group has children or is referenced by any Item (we surface the
 * backend's message in a toast when that happens).
 */
export function ItemGroupRow({ name }: { name: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  return (
    <li className="group flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-sm hover:bg-muted/30">
      <span className="truncate">{name}</span>
      <div className="hidden items-center gap-0.5 opacity-0 transition group-hover:flex group-hover:opacity-100">
        <PillBtn label="Rename" icon={Pencil} onClick={() => setEditOpen(true)} />
        <PillBtn label="Delete" icon={Trash2} tone="destructive" onClick={() => setDelOpen(true)} />
      </div>

      <RenameDialog name={name} open={editOpen} setOpen={setEditOpen} />
      <DeleteDialog name={name} open={delOpen} setOpen={setDelOpen} />
    </li>
  );
}

function PillBtn({
  label, icon: Icon, onClick, tone = "default",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-semibold",
        tone === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function RenameDialog({
  name, open, setOpen,
}: {
  name: string; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) { setValue(name); setErr(null); }
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await renameItemGroupAction(name, value);
      if (!res.ok) { setErr(res.error); return; }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename item group</DialogTitle>
          <DialogDescription>
            All items currently in <span className="font-mono text-foreground">{name}</span> will
            follow the new name — Frappe updates the references for you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            placeholder="New name"
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
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
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !value.trim() || value.trim() === name}
            className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Rename
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  name, open, setOpen,
}: {
  name: string; open: boolean; setOpen: (b: boolean) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await deleteItemGroupAction(name);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this group?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing <strong>{name}</strong>. If any items still live inside
            this group, or the group has children, the system will refuse
            the delete and tell you why — move those first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); run(); }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
