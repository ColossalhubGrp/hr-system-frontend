"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { alumniLoginAction } from "./actions";
import { cn } from "@/lib/cn";

type State = { error?: string };
const INITIAL: State = {};

export function AlumniLoginForm() {
  const [state, action] = useFormState(alumniLoginAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        id="usr"
        label="Email"
        icon={<Mail className="h-4 w-4 text-ash-500" />}
        input={
          <input
            id="usr"
            name="usr"
            type="email"
            autoComplete="username"
            required
            className="h-11 w-full rounded-xl border border-hairline bg-surface pl-9 pr-3 text-sm placeholder:text-ash-500 focus-ring"
            placeholder="you@personal-email.com"
          />
        }
      />

      <Field
        id="pwd"
        label="Password"
        icon={<Lock className="h-4 w-4 text-ash-500" />}
        input={
          <input
            id="pwd"
            name="pwd"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-xl border border-hairline bg-surface pl-9 pr-3 text-sm placeholder:text-ash-500 focus-ring"
            placeholder="•••••••••••"
          />
        }
      />

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-sm text-fall"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </p>
      )}

      <Submit />
    </form>
  );
}

function Field({
  id,
  label,
  icon,
  input,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  input: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ash-700">{label}</span>
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon}
        </span>
        {input}
      </span>
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "h-11 rounded-xl bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? "Verifying alumni access…" : "Enter alumni portal"}
    </button>
  );
}
