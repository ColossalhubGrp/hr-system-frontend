import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Reset password · Colossal HR",
};

/**
 * Reached from the password-reset email link as
 * /reset-password?email=...&token=... — we don't pre-verify the token on the
 * server here (the recruitment backend exposes show_reset_password_form for
 * that, but it issues a redirect we'd then ignore). The actual reset action
 * does the token check; if it fails, the form surfaces the error.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string; token?: string };
}) {
  const email = searchParams?.email?.trim();
  const token = searchParams?.token?.trim();

  return (
    <AuthShell
      title={
        <>
          Choose your new
          <br />
          password.
        </>
      }
      subtitle="One last step — set a fresh password and you're back in."
    >
      <AuthBrandMark />
      {!email || !token ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                Missing reset link
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This page needs the email + token that comes in the reset
                email. Request a new link from the sign-in page if your
                previous one expired.
              </p>
            </div>
          </div>
          <Button asChild className="mt-5 w-full">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center gap-1.5"
            >
              Request a reset link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <ResetForm email={email} token={token} />
      )}
    </AuthShell>
  );
}
