"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

// Allow both the inline-error pattern (`{error?: string} | undefined`)
// and plain void-returning actions (the Belina-style Setup actions).
type Result = { error?: string } | undefined | void;
type ActionFn = (id: string) => Promise<Result>;

async function runWithToast(
  action: ActionFn,
  id: string,
  successMessage: string,
): Promise<void> {
  try {
    const res = await action(id);
    if (res && typeof res === "object" && "error" in res && res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(successMessage);
  } catch (err) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Action failed.";
    toast.error(msg);
  }
}

/**
 * "Pause", "Approve", "Mark filed" etc. — fires a Server Action with
 * the row id, shows a spinner while pending, toasts the result.
 */
export function ActionButton({
  id,
  label,
  action,
  successMessage,
}: {
  id: string;
  label: string;
  action: ActionFn;
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(() => runWithToast(action, id, successMessage ?? `${label}d.`))
      }
      disabled={pending}
      className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="inline-block h-3 w-3 animate-spin" />
      ) : (
        label
      )}
    </button>
  );
}

/** "Delete" — opens a shadcn AlertDialog for confirmation, toasts on
 *  completion. Replaced the previous native window.confirm() so the
 *  affordance matches the rest of the workspace. */
export function DeleteButton({
  id,
  label = "Delete",
  confirmText = "Delete this?",
  confirmDescription,
  action,
  successMessage,
}: {
  id: string;
  label?: string;
  confirmText?: string;
  confirmDescription?: string;
  action: ActionFn;
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <ConfirmDialog
      title={confirmText}
      description={
        confirmDescription ?? "This can't be undone."
      }
      confirmLabel={label}
      destructive
      onConfirm={() =>
        new Promise<void>((resolve) => {
          start(async () => {
            await runWithToast(action, id, successMessage ?? "Deleted.");
            resolve();
          });
        })
      }
    >
      <button
        type="button"
        disabled={pending}
        className={cn(
          "text-xs font-semibold text-destructive hover:underline disabled:opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="inline-block h-3 w-3 animate-spin" />
        ) : (
          label
        )}
      </button>
    </ConfirmDialog>
  );
}
