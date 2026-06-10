"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ActionState = { error?: string };
type Action = (prev: ActionState) => Promise<ActionState>;
const EMPTY: ActionState = {};

/**
 * Single-action submit panel — for "Submit", "Mark complete", "Cancel doc",
 * etc. Pair with `useFormState` so the resulting error renders in place
 * instead of bubbling to the page.
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
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div>
        <p className="text-sm font-medium text-ash-900">{title}</p>
        {description && <p className="text-xs text-ash-500">{description}</p>}
      </div>
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}
      <form action={dispatch}>
        <Btn tone={tone} pendingLabel={pendingLabel} icon={icon}>
          {label}
        </Btn>
      </form>
    </div>
  );
}

function Btn({
  tone,
  pendingLabel,
  icon,
  children,
}: {
  tone: "primary" | "danger";
  pendingLabel: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold transition focus-ring",
        tone === "primary"
          ? "bg-ink-800 text-white hover:bg-ink-700"
          : "bg-surface text-fall border border-fall/40 hover:bg-fall/[0.06]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {icon}
      {pending ? pendingLabel : children}
    </button>
  );
}
