"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { alumniLoginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error?: string };
const INITIAL: State = {};

export function AlumniLoginForm() {
  const [state, action] = useFormState(alumniLoginAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <IconField
        id="usr"
        label="Email"
        icon={<Mail className="h-4 w-4 text-muted-foreground" />}
      >
        <Input
          id="usr"
          name="usr"
          type="email"
          autoComplete="username"
          required
          className="h-11 pl-9"
          placeholder="you@personal-email.com"
        />
      </IconField>

      <IconField
        id="pwd"
        label="Password"
        icon={<Lock className="h-4 w-4 text-muted-foreground" />}
      >
        <Input
          id="pwd"
          name="pwd"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 pl-9"
          placeholder="•••••••••••"
        />
      </IconField>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </p>
      )}

      <Submit />
    </form>
  );
}

function IconField({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full">
      {pending ? "Verifying alumni access…" : "Enter alumni portal"}
    </Button>
  );
}
