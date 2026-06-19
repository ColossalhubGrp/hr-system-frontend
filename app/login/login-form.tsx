"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { loginAction, resendActivationAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

type State = { error?: string };
const INITIAL: State = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useFormState(loginAction, INITIAL);
  const [email, setEmail] = useState("");

  // Inline "didn't get the activation email?" resend block — same shape as
  // the recruitment app's, but it talks to a smart_hr_web Server Action.
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendOk, setResendOk] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  return (
    <>
      {state.error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={action} className="space-y-4" noValidate>
        {redirectTo && (
          <input type="hidden" name="redirect" value={redirectTo} />
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="usr"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="usr"
              name="usr"
              type="email"
              required
              autoComplete="username"
              placeholder="you@colossalhub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="pwd"
              className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="pwd"
            name="pwd"
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </div>

        <Submit />
      </form>

      <div className="mt-6 space-y-3 border-t pt-5">
        <p className="text-center text-sm text-muted-foreground">
          New to Colossal HR?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
        <div className="text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
            onClick={() => {
              setShowResend((s) => !s);
              setResendEmail(email);
              setResendMsg("");
              setResendOk(false);
            }}
          >
            Didn&apos;t receive the activation email?
          </button>
        </div>
      </div>

      {showResend && (
        <div className="mt-4 space-y-3 rounded-xl border bg-muted/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resend activation email
          </p>
          <div className="space-y-1">
            <Label
              htmlFor="resendEmail"
              className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="resendEmail"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              disabled={resendLoading}
              className="bg-background"
            />
          </div>
          {resendMsg && (
            <p
              className={
                "flex items-start gap-1.5 text-xs " +
                (resendOk ? "text-rise" : "text-destructive")
              }
            >
              {resendOk ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              )}
              {resendMsg}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                setResendLoading(true);
                setResendMsg("");
                setResendOk(false);
                const res = await resendActivationAction(resendEmail);
                if (res.ok) {
                  setResendMsg("Activation email resent. Check your inbox.");
                  setResendOk(true);
                } else {
                  setResendMsg(res.error);
                  setResendOk(false);
                }
                setResendLoading(false);
              }}
              disabled={resendLoading || !resendEmail}
            >
              {resendLoading ? "Sending…" : "Resend"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowResend(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
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
          Signing in…
        </>
      ) : (
        <>
          Sign in
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
