import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

export const metadata: Metadata = {
  title: "Activate account · Colossal HR",
};

/**
 * Token-based activation handler. The activation email points users at
 * /activate?email=...&token=... — we hit the backend immediately on the
 * server, then render a success or failure state. No client-side state
 * needed because activation either works on the first try (token valid)
 * or doesn't (token expired/already used).
 */
export default async function ActivatePage({
  searchParams,
}: {
  searchParams?: { email?: string; token?: string };
}) {
  const email = searchParams?.email?.trim();
  const token = searchParams?.token?.trim();

  if (!email || !token) {
    return (
      <AuthShell
        title={<>Almost there.</>}
        subtitle="Open the activation link from your email — it carries the token we need to verify your account."
      >
        <AuthBrandMark />
        <ActivationCard
          tone="error"
          title="Missing activation link"
          message="This page needs both an email and a token in the URL. Open the link we sent to your inbox, or request a new activation email from the sign-in page."
          primary={{ href: "/login", label: "Back to sign in" }}
        />
      </AuthShell>
    );
  }

  const res = await frappeGuestCall<{
    success?: boolean;
    message?: string;
    redirect_url?: string;
  }>("recruitment_app.api.auth.activate_account", { email, token });

  const ok = res.ok && (res.data?.success ?? true);
  const errorMsg = res.ok
    ? res.data?.message ?? "Activation token is invalid or has expired."
    : res.error;

  return (
    <AuthShell
      title={
        ok ? (
          <>
            You&apos;re in.
            <br />
            Account activated.
          </>
        ) : (
          <>
            Activation
            <br />
            didn&apos;t go through.
          </>
        )
      }
      subtitle={
        ok
          ? "Sign in to start using your Colossal HR workspace."
          : "The token in your email link may have expired or already been used. Request a new one from the sign-in page."
      }
    >
      <AuthBrandMark />
      <ActivationCard
        tone={ok ? "success" : "error"}
        title={ok ? "Account activated" : "Activation failed"}
        message={
          ok
            ? res.data?.message ??
              `Welcome to Colossal HR. You can now sign in with ${email}.`
            : errorMsg
        }
        email={email}
        primary={
          ok
            ? { href: "/login", label: "Continue to sign in" }
            : { href: "/login", label: "Resend activation email" }
        }
      />
    </AuthShell>
  );
}

function ActivationCard({
  tone,
  title,
  message,
  email,
  primary,
}: {
  tone: "success" | "error";
  title: string;
  message: string;
  email?: string;
  primary: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full " +
            (tone === "success"
              ? "bg-rise/15 text-rise"
              : "bg-destructive/15 text-destructive")
          }
        >
          {tone === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>

      {email && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              For
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink-900">
              {email}
            </p>
          </div>
        </div>
      )}

      <Button asChild className="mt-5 w-full">
        <Link
          href={primary.href}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
