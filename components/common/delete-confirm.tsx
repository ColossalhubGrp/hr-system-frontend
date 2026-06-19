"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type State = { error?: string };
type Action = (prev: State) => Promise<State>;
const EMPTY: State = {};

/**
 * Two-click destructive panel. Migrated to shadcn primitives — the danger
 * Card border tints destructive; the confirm button uses the destructive
 * variant.
 */
export function DeleteConfirm({
  title,
  description,
  confirmTitle,
  confirmDescription,
  label = "Delete",
  pendingLabel = "Deleting…",
  action,
}: {
  title: string;
  description?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  label?: string;
  pendingLabel?: string;
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [armed, setArmed] = useState(false);

  return (
    <Card className="border-destructive/30 bg-destructive/[0.03]">
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-destructive">
            {armed ? (confirmTitle ?? title) : title}
          </p>
          <p className="text-xs text-muted-foreground">
            {armed
              ? (confirmDescription ??
                "This can't be undone. Click again to confirm.")
              : description}
          </p>
        </div>

        {state.error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {state.error}
          </p>
        )}

        {!armed ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setArmed(true)}
            className="w-fit border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4" />
            {label}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <form action={dispatch}>
              <ConfirmBtn pendingLabel={pendingLabel} label={label} />
            </form>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setArmed(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmBtn({
  pendingLabel,
  label,
}: {
  pendingLabel: string;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      <Trash2 className="h-4 w-4" />
      {pending ? pendingLabel : `Yes, ${label.toLowerCase()}`}
    </Button>
  );
}
