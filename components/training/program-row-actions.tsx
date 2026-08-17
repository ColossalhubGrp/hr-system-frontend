"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteTrainingProgramAction } from "@/app/(workspace)/hr/training/actions";

/** Row actions rendered next to each Training Program on the
 *  Programs list. Edit is a plain link to /hr/training/programs/[id]/edit
 *  (server component handles the form). Delete calls the whitelisted
 *  action wrapped in ConfirmDialog. */
export function ProgramRowActions({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  const remove = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteTrainingProgramAction(id);
        if (!res.ok) toast.error(res.error);
        else toast.success(`Deleted "${label}".`);
        resolve();
      });
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-foreground"
        title="Edit program"
      >
        <Link
          href={
            `/hr/training/programs/${encodeURIComponent(id)}/edit` as Route
          }
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <ConfirmDialog
        title={`Delete "${label}"?`}
        description="Events linked to this program keep their reference; only the program is removed."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      >
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
          title="Delete program"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </ConfirmDialog>
    </div>
  );
}
