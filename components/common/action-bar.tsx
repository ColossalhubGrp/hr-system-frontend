"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ActionState = { error?: string };
type Action = (prev: ActionState) => Promise<ActionState>;
const EMPTY: ActionState = {};

/**
 * Single-action submit panel — for "Submit", "Mark complete", "Cancel doc",
 * etc. Pair with `useFormState` so the resulting error renders in place
 * instead of bubbling to the page.
 *
 * Migrated to shadcn primitives. `tone="danger"` maps onto the shadcn
 * destructive variant; `tone="primary"` uses the default brand button.
 */
export function ActionPanel({
  title,
  description,
  label,
  pendingLabel,
  tone = "primary",
  icon,
  action,
}: {
  title: string;
  description?: string;
  label: string;
  pendingLabel: string;
  tone?: "primary" | "danger";
  icon?: React.ReactNode;
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
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
        <form action={dispatch}>
          <SubmitBtn tone={tone} pendingLabel={pendingLabel} icon={icon} label={label} />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitBtn({
  tone,
  pendingLabel,
  icon,
  label,
}: {
  tone: "primary" | "danger";
  pendingLabel: string;
  icon?: React.ReactNode;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={tone === "danger" ? "outline" : "default"}
      className={
        tone === "danger"
          ? "border-destructive/40 text-destructive hover:bg-destructive/5"
          : undefined
      }
    >
      {icon}
      {pending ? pendingLabel : label}
    </Button>
  );
}
