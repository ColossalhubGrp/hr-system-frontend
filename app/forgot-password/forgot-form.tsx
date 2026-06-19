"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ForgotState } from "./actions";

const INITIAL: ForgotState = {};

export function ForgotForm() {
  const [state, dispatch] = useFormState(forgotPasswordAction, INITIAL);

  if (state.success) {
    return (
      <>
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rise/15 text-rise">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                Check your email
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                If an account exists with that email, a password reset link has
                been sent.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sent to
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-ink-900">
                {state.success.email}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            The link expires in 30 minutes. Didn&apos;t see the email? Check
            your spam folder or{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              try again
            </Link>
            .
          </p>

          <Button asChild className="mt-5 w-full">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5"
            >
              Back to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>

      <div className="mb-8 flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll send a one-time link to your email.
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
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
            />
          </div>
        </div>
        <Submit />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full font-semibold">
      {pending ? (
        <>
          <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Sending…
        </>
      ) : (
        <>
          Send reset link
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
