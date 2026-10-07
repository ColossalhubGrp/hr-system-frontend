import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Award, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { isAuthenticated } from "@/lib/frappe/session";
import { getMyAccess } from "@/lib/frappe/roles";
import { AlumniLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Alumni sign-in · Colossal HR",
};

export default async function AlumniLoginPage() {
  // If they're already signed in, route them appropriately. Don't double-prompt.
  if (isAuthenticated()) {
    const access = await getMyAccess();
    if (access.isAlumniOnly) {
      redirect("/alumni");
    }
    // Signed-in active user landed here by mistake — push them to root.
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Brand lockup — top-left on wide, same spot as the main /login. */}
      <header className="w-full px-6 pt-8 md:px-10 md:pt-10">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9 ring-1 ring-hairline" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Colossal HR
          </span>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="auth-fade-up w-full max-w-sm">
          <header className="mb-6">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-800">
              <Award className="h-3 w-3" />
              Alumni
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to the alumni portal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only ex-employees with an active alumni invite can sign in here.
            </p>
          </header>

          <AlumniLoginForm />

          <div className="mt-8 flex flex-col gap-2 text-xs text-muted-foreground">
            <p>
              Trouble signing in? Email{" "}
              <a href="mailto:hr@colossalhub.com" className="underline">
                hr@colossalhub.com
              </a>{" "}
              and we&apos;ll re-issue your alumni invite.
            </p>
            <Link
              href={"/login" as Route}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              I&apos;m a current employee — take me to the main sign-in
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 pb-6 text-xs text-muted-foreground md:px-10 md:pb-8">
        <p className="mx-auto max-w-sm text-center text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} Colossal HR. Alumni access is read-only.
        </p>
      </footer>
    </main>
  );
}
