"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Ban, CheckCircle2, Trash2, Loader2, AlertCircle,
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
  updateCostCenterAction,
  setCostCenterDisabledAction,
  smartDeleteCostCenterAction,
} from "@/app/(workspace)/accounting/cost-centers/actions";
import { cn } from "@/lib/cn";

/**
 * Action bar for the Cost Center detail page. Mirrors the tree's
 * inline toolbar but lives in the PageHeader so the detail view
 * isn't a dead-end.
 *
 *   [Edit] [Disable/Enable] [Delete]
 *
 * After a successful rename, routes to the new id so the detail
 * page follows the record.
 */
export function CostCenterDetailActions({
  name, label, isGroup, disabled, company, backHref,
}: {
  name: string;
  label: string;
  isGroup: boolean;
  disabled: boolean;
  company: string;
  backHref: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [pending, start] = useTransition();

  const toggleDisabled = () => {
    start(async () => {
      const res = await setCostCenterDisabledAction(name, !disabled);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message);
      router.refresh();
    });
  };

  const runDelete = () => {
    start(async () => {
      const res = await smartDeleteCostCenterAction(name);
      if (!res.ok) { toast.error(res.error); return; }
      if (res.action === "deleted") {
        toast.success(res.message);
        router.push(backHref as never);
      } else {
        toast.message(res.message);
        setDelOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-input bg-transparent px-3 text-sm font-semibold hover:bg-muted/40 focus-ring"
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
          disabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
      >
        {disabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
        {disabled ? "Re-enable" : "Disable"}
      </button>
      <button
        type="button"
        onClick={() => setDelOpen(true)}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-chip border border-destructive/40 bg-destructive/5 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      <EditDialog
        open={editOpen}
        setOpen={setEditOpen}
        name={name}
        initialLabel={label}
        initialIsGroup={isGroup}
        initialDisabled={disabled}
        company={company}
      />

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
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
              onClick={(e) => { e.preventDefault(); runDelete(); }}
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

function EditDialog({
  open, setOpen, name, initialLabel, initialIsGroup, initialDisabled, company,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  name: string;
  initialLabel: string;
  initialIsGroup: boolean;
  initialDisabled: boolean;
  company: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);
  const [isGroup, setIsGroup] = useState(initialIsGroup);
  const [disabled, setDisabled] = useState(initialDisabled);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setLabel(initialLabel);
      setIsGroup(initialIsGroup);
      setDisabled(initialDisabled);
      setErr(null);
    }
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateCostCenterAction(name, {
        costCenterName: label,
        isGroup,
        disabled,
      });
      if (!res.ok) { setErr(res.error); return; }
      toast.success(res.message);
      setOpen(false);
      if (res.name !== name) {
        // Record was renamed — follow it so the URL matches.
        router.push(
          `/accounting/cost-centers/${encodeURIComponent(res.name)}?company=${encodeURIComponent(company)}` as never,
        );
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit cost center</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-foreground">{name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Name
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm font-normal"
            />
          </label>
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
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !label.trim()}
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
