"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { createCostCenterAction } from "./actions";
import { cn } from "@/lib/cn";

export type ParentOption = { name: string; label: string; isGroup: boolean };

/**
 * Add Cost Center dialog. Mirrors the Chart of Accounts add dialog in
 * tone and layout — one short form, parent prefilled from the row the
 * user clicked "Add child" on, inline error.
 */
export function AddCostCenterDialog({
  company,
  parents,
  presetParent,
  trigger,
}: {
  company: string;
  parents: ParentOption[];
  /** When set, the Parent select is pre-chosen (and the user can still
   *  change it, in case they realised they clicked the wrong group). */
  presetParent?: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState(presetParent ?? parents[0]?.name ?? "");
  const [isGroup, setIsGroup] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Reset the form every time the dialog opens so a prior failed
  // attempt doesn't leak into the next one.
  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setName("");
      setParent(presetParent ?? parents[0]?.name ?? "");
      setIsGroup(false);
      setErr(null);
    }
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await createCostCenterAction({
        costCenterName: name.trim(),
        company,
        parentCostCenter: parent,
        isGroup,
      });
      if (!res.ok) { setErr(res.error); return; }
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add cost center</DialogTitle>
          <DialogDescription>
            New rows live under a parent group. Mark it a group only if
            you plan to nest other cost centers inside it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. North Branch"
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </Field>

          <Field label="Parent" required hint="Must be a group cost center.">
            <select
              value={parent}
              onChange={(e) => setParent(e.currentTarget.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {parents.map((p) => (
                <option key={p.name} value={p.name}>{p.label}</option>
              ))}
            </select>
          </Field>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            This is a group (other cost centers will sit under it)
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
            disabled={pending || !name.trim() || !parent}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white disabled:opacity-60 hover:bg-ink-700",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
