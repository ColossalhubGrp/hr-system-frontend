"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";

type Action = (prev: StdFormState, form: FormData) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export function DesignationDeleteButton({
  name,
  disabled,
  action,
}: {
  name: string;
  disabled: boolean;
  action: Action;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);

  return (
    <form action={dispatch} className="inline-flex">
      <input type="hidden" name="name" value={name} />
      <Btn
        disabled={disabled}
        title={
          disabled
            ? `${name} is assigned to employees — reassign them first.`
            : `Delete ${name}`
        }
      />
      {state.error && (
        <span
          className="ml-2 max-w-[240px] truncate text-xs text-fall"
          title={state.error}
        >
          {state.error}
        </span>
      )}
    </form>
  );
}

function Btn({ disabled, title }: { disabled: boolean; title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      title={title}
      className={cn(
        "rounded-md p-1.5 transition focus-ring",
        disabled
          ? "cursor-not-allowed text-ash-300"
          : "text-ash-500 hover:bg-fall/10 hover:text-fall",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
