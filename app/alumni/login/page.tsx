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
        {/* Brand panel — animated but quieter than the main /login
            because this is an archival surface, not a live workspace.
            Two drifting blobs (not three), a soft dot-grid, a fade-up
            entrance, and a marquee of record-type labels along the
            bottom. Same motion vocabulary as /login (globals.css
            auth-* keyframes); same prefers-reduced-motion gate. */}
        <aside className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="auth-blob-1 absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ink-700 opacity-35 blur-3xl" />
            <div className="auth-blob-2 absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-ink-500 opacity-30 blur-3xl" />
          </div>
          <div aria-hidden className="auth-dot-grid pointer-events-none absolute inset-0" />

          <div className="relative auth-fade-up flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <span className="text-base font-semibold tracking-tight">
              Colossal HR
            </span>
          </div>

          <div
            className="relative auth-fade-up space-y-4"
            style={{ ["--auth-fade-delay" as string]: "150ms" }}
          >
            <div className="inline-flex items-center gap-2 rounded-chip bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 backdrop-blur-sm">
              <Award className="h-3.5 w-3.5" />
              Alumni gate
            </div>
            <h1 className="text-3xl font-semibold leading-tight">
              Welcome back.
            </h1>
            <p className="max-w-sm text-sm text-ink-50/80">
              This sign-in is for former colleagues. We&apos;ll show you a read-only
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

          <div
            className="relative auth-fade-up space-y-4"
            style={{ ["--auth-fade-delay" as string]: "300ms" }}
          >
            {/* Archival capability marquee — fewer labels + slower
                vibe than the main login. */}
            <div
              className="auth-marquee overflow-hidden"
              style={{
                maskImage:
                  "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
              }}
              aria-hidden
            >
              <div className="auth-marquee-track flex w-max gap-3 whitespace-nowrap">
                {[
                  "Payslips", "Tenure", "Last role", "Certificates",
                  "Exit letter", "Benefits summary",
                ]
                  .flatMap((l) => [l, l])
                  .map((label, i) => (
                    <span
                      key={`${label}-${i}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/60"
                    >
                      {label}
                    </span>
                  ))}
              </div>
            </div>

            <p className="text-xs text-ink-50/60">
              © {new Date().getFullYear()} Colossal HR. Alumni access is read-only.
            </p>
          </div>
        </aside>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="auth-fade-up w-full max-w-sm">
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
                and we&apos;ll re-issue your alumni invite.
              </p>
              <Link
                href={"/login" as Route}
                className="inline-flex items-center gap-1 text-ink-700 hover:underline"
              >
                I&apos;m a current employee — take me to the main sign-in
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
