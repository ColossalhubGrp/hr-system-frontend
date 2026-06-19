"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { resetPasswordAction, type ResetState } from "./actions";

const INITIAL: ResetState = {};

export function ResetForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, dispatch] = useFormState(resetPasswordAction, INITIAL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rise/15 text-rise">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-900">
              Password reset
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              You can now sign in with your new password.
            </p>
          </div>
        </div>
        <Button asChild className="mt-5 w-full">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5"
          >
            Continue to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick something strong — at least 8 characters.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resetting password for
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink-900">
            {email}
          </p>
        </div>
      </div>

      {state.error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={dispatch} className="space-y-4" noValidate>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            New password
          </Label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fe.password && (
            <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {fe.password}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Confirm new password
          </Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={showMismatch || undefined}
            inputClassName={
              showMismatch
                ? "border-destructive focus:border-destructive"
                : confirmPassword && passwordsMatch
                  ? "border-rise focus:border-rise"
                  : undefined
            }
          />
          {showMismatch && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              Passwords don&apos;t match.
            </p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rise">
              <CheckCircle2 className="h-3 w-3" />
              Passwords match.
            </p>
          )}
        </div>

        <Submit disabled={showMismatch} />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="w-full font-semibold"
    >
      {pending ? (
        <>
          <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Updating…
        </>
      ) : (
        <>
          Update password
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
