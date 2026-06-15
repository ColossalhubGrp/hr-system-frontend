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
    <main className="min-h-screen bg-canvas">
      <div className="grid min-h-screen lg:grid-cols-[460px_1fr]">
        <aside className="relative hidden bg-ink-800 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <span className="text-base font-semibold tracking-tight">
              Colossal HR
            </span>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-chip bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <Award className="h-3.5 w-3.5" />
              Alumni gate
            </div>
            <h1 className="text-3xl font-semibold leading-tight">
              Welcome back.
            </h1>
            <p className="max-w-sm text-sm text-ink-50/80">
              This sign-in is for former colleagues. We'll show you a read-only
              window into your historical records — your last role, tenure, and
              final salary slips.
            </p>
            <p className="max-w-sm text-xs text-ink-50/60">
              Current employee? Use the{" "}
              <Link
                href={"/login" as Route}
                className="underline underline-offset-2 hover:text-white"
              >
                main sign-in
              </Link>{" "}
              instead.
            </p>
          </div>

          <p className="text-xs text-ink-50/60">
            © {new Date().getFullYear()} Colossal HR. Alumni access is read-only.
          </p>
        </aside>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandMark className="mb-3 h-10 w-10 ring-1 ring-hairline" />
              <span className="text-sm font-semibold text-ink-800">
                Colossal HR
              </span>
            </div>

            <header className="mb-6">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-chip bg-ink-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-800">
                <Award className="h-3 w-3" />
                Alumni
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
                Sign in to the alumni portal
              </h2>
              <p className="mt-1 text-sm text-ash-600">
                Only ex-employees with an active alumni invite can sign in here.
              </p>
            </header>

            <AlumniLoginForm />

            <div className="mt-8 flex flex-col gap-2 text-xs text-ash-500">
              <p>
                Trouble signing in? Email{" "}
                <a href="mailto:hr@colossalhub.com" className="underline">
                  hr@colossalhub.com
                </a>{" "}
                and we'll re-issue your alumni invite.
              </p>
              <Link
                href={"/login" as Route}
                className="inline-flex items-center gap-1 text-ink-700 hover:underline"
              >
                I'm a current employee — take me to the main sign-in
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
