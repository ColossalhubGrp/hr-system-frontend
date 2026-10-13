import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "./update-form";

export const metadata: Metadata = {
  title: "Set your password · Colossal Hub",
};

/**
 * Lands here from the branded password-reset email dispatched by
 * recruitment_app/compat/user.py — URL shape is
 * /update-password?key=<reset-key>. The key is Frappe's native
 * reset_password_key; we post it to
 * `frappe.core.doctype.user.user.update_password` (allow_guest=True)
 * along with the new password.
 *
 * On success the form flips to a "Password set" card with a button
 * back to /login — the user never lands on the Frappe desk UI at
 * api.colossalhub.com/app/home again.
 */
export default function UpdatePasswordPage({
  searchParams,
}: {
  searchParams?: { key?: string };
}) {
  const key = searchParams?.key?.trim();

  return (
    <AuthShell
      title={
        <>
          Set your
          <br />
          password.
        </>
      }
      subtitle="One last step — pick a password and you're ready to sign in."
    >
      <AuthBrandMark />
      {!key ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ash-900">
                Missing reset link
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This page needs the key that comes in your reset
                email. Request a new link from the sign-in page if
                yours expired.
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
        <UpdatePasswordForm resetKey={key} />
      )}
    </AuthShell>
  );
}
