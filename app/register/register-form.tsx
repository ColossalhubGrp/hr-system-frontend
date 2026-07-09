"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Mail,
  Phone,
  User as UserIcon,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/auth/password-input";
import { registerAction, type RegisterState } from "./actions";

export type CompanyOption = { id: string; name: string };
type AccountType = "hr" | "candidate";

const ACCOUNT_OPTIONS: {
  value: AccountType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "hr",
    title: "HR / Recruiter",
    description: "Post jobs, review candidates, and manage hiring.",
    icon: Briefcase,
  },
  {
    value: "candidate",
    title: "Candidate",
    description: "Search jobs, apply, and attend AI interviews.",
    icon: UserCircle2,
  },
];

const INITIAL: RegisterState = {};

export function RegisterForm({ companies }: { companies: CompanyOption[] }) {
  const [state, dispatch] = useFormState(registerAction, INITIAL);

  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const requiresCompany = accountType === "hr";
  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const fe = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <>
        <div className="mb-6 flex items-center justify-center md:justify-start">
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
                Account created
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {state.success.message}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Activation email sent to
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-ink-900">
                {state.success.email}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Click the link in your email to activate your account. If you
            don&apos;t see it, check your spam folder.
          </p>

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
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight text-ink-900">
          Create account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Already have one?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {state.error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={dispatch} className="space-y-4">
        {/* Account type radio cards */}
        <fieldset className="space-y-1.5">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            I&apos;m registering as
          </legend>
          <div className="grid gap-2">
            {ACCOUNT_OPTIONS.map(({ value, title, description, icon: Icon }) => {
              const active = accountType === value;
              return (
                <label
                  key={value}
                  className={
                    "group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all " +
                    (active
                      ? "border-primary bg-primary/[0.04] shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]"
                      : "border-input bg-card hover:bg-muted/40")
                  }
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={active}
                    onChange={() => setAccountType(value)}
                    className="sr-only"
                  />
                  <span
                    className={
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg " +
                      (active
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary")
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={
                        "text-sm font-semibold " +
                        (active ? "text-primary" : "text-ink-900")
                      }
                    >
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {fe.accountType && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {fe.accountType}
            </p>
          )}
        </fieldset>

        <Field label="Full name" htmlFor="fullName" error={fe.fullName}>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              placeholder="Jane Doe"
              className="pl-9"
            />
          </div>
        </Field>

        {requiresCompany && (
          <Field label="Company" htmlFor="company" error={fe.company}>
            {companies.length === 0 ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-700">
                No companies are set up yet. Ask your administrator to create
                one before registering.
              </p>
            ) : (
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger
                  id="company"
                  className="h-10 pl-9 relative"
                  aria-invalid={Boolean(fe.company) || undefined}
                >
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <SelectValue placeholder="Select your company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <input type="hidden" name="company" value={company} />
          </Field>
        )}

        <Field label="Email" htmlFor="email" error={fe.email}>
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
        </Field>

        <Field label="Phone (optional)" htmlFor="phone" error={fe.phone}>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              name="phone"
              autoComplete="tel"
              placeholder="+263 712 345 6789"
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="password" error={fe.password}>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={fe.confirmPassword}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            autoComplete="new-password"
            placeholder="Re-enter your password"
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
        </Field>

        <Submit disabled={showMismatch} />
      </form>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        By creating an account you agree to our terms of service and privacy
        policy.
      </p>
    </>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {error && (
        <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
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
          Creating account…
        </>
      ) : (
        <>
          Create account
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
