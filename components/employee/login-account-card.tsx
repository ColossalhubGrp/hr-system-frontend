"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, Check, Mail, UserPlus } from "lucide-react";
import { Field, TextInput } from "@/components/employee/form-bits";
import { Button } from "@/components/ui/button";
import {
  provisionEmployeeLoginAction,
  type LoginAccountState,
} from "@/app/(workspace)/employee/actions";

export type LoginStatus = {
  linked: boolean;
  email: string | null;
  candidate_email: string | null;
  enabled: boolean;
  has_password: boolean;
};

const EMPTY: LoginAccountState = {};

function PendingButton({
  children,
  value,
  variant,
}: {
  children: React.ReactNode;
  value?: { name: string; value: string };
  variant?: "default" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      {...(value ? { name: value.name, value: value.value } : {})}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}

/**
 * HR-admin control on the employee profile to create and manage the
 * employee's sign-in account without touching the terminal: create +
 * link the account, set an initial password, or send an invite email.
 * On a tenant site the action also registers the login-routing entry so
 * the employee can actually reach the shared frontend.
 */
export function LoginAccountCard({
  employeeId,
  status,
}: {
  employeeId: string;
  status: LoginStatus;
}) {
  const action = provisionEmployeeLoginAction.bind(null, employeeId);
  const [state, formAction] = useFormState(action, EMPTY);
  const [linked, setLinked] = useState(status.linked);
  const [hasPassword, setHasPassword] = useState(status.has_password);

  useEffect(() => {
    if (state.ok) {
      setLinked(true);
      setHasPassword(Boolean(state.hasPassword));
    }
  }, [state.ok, state.hasPassword]);

  const email = state.email ?? status.email ?? status.candidate_email;

  return (
    <section className="mt-6 rounded-card border border-line p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-canvas text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ash-900">Login account</h3>
          <p className="mt-1 text-xs leading-relaxed text-ash-600">
            The account this employee signs in with. Create it, set an initial
            password, or email them an invite to choose their own.
          </p>

          {state.error ? (
            <p className="mt-3 rounded-card bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-card bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              {state.created
                ? "Login account created."
                : state.invited
                  ? "Invite email sent."
                  : "Password set."}
            </p>
          ) : null}

          {!linked && !status.candidate_email ? (
            <p className="mt-4 rounded-card bg-canvas px-3 py-2 text-xs text-ash-600">
              Add a company or personal email on this employee&rsquo;s Contact
              details first — the login account is created at that address.
            </p>
          ) : !linked ? (
            <form action={formAction} className="mt-4">
              <p className="mb-3 text-xs text-ash-700">
                No login account yet. One will be created at{" "}
                <span className="font-medium text-ash-900">
                  {status.candidate_email}
                </span>
                .
              </p>
              <PendingButton>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Create login account
              </PendingButton>
            </form>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ash-500">Signs in as</span>
                <span className="font-medium text-ash-900">{email}</span>
                <span
                  className={`rounded-chip px-2 py-0.5 font-medium ${
                    hasPassword
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {hasPassword ? "Password set" : "No password yet"}
                </span>
              </div>

              <form action={formAction} className="flex flex-col gap-3">
                <Field
                  label="Set an initial password"
                  htmlFor="password"
                  hint="At least 8 characters. Share it with the employee; they can change it after signing in."
                >
                  <TextInput
                    id="password"
                    name="password"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. a temporary password"
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <PendingButton>Set password</PendingButton>
                  <PendingButton
                    variant="secondary"
                    value={{ name: "send_invite", value: "1" }}
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Send invite email
                  </PendingButton>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
