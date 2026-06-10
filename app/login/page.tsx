import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/layout/brand-mark";
import { isAuthenticated } from "@/lib/frappe/session";
import { publicEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Colossal HR",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  if (isAuthenticated()) {
    redirect(searchParams?.redirect ?? "/dashboard");
  }

  const brand = publicEnv.NEXT_PUBLIC_BRAND_NAME;

  return (
    <main className="min-h-screen bg-canvas">
      {/* Two-column layout: left rail mirrors the in-app sidebar so signing in
          feels continuous with the rest of the product. Right side keeps the
          form short and centred. */}
      <div className="grid min-h-screen lg:grid-cols-[460px_1fr]">
        <aside className="relative hidden bg-ink-800 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <span className="text-base font-semibold tracking-tight">
              {brand}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight">
              Colossal HR
            </h1>
            <p className="max-w-sm text-sm text-ink-50/80">
              People, time, performance, and payroll — one workspace, built for
              African organisations.
            </p>
          </div>

          <p className="text-xs text-ink-50/60">
            © {new Date().getFullYear()} {brand}. All rights reserved.
          </p>
        </aside>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandMark className="mb-3 h-10 w-10 ring-1 ring-hairline" />
              <span className="text-sm font-semibold text-ink-800">
                {brand}
              </span>
            </div>

            <header className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-ash-600">
                Sign in with your work email to continue.
              </p>
            </header>

            <LoginForm redirectTo={searchParams?.redirect} />

            <p className="mt-8 text-xs text-ash-500">
              Trouble signing in? Contact your HR administrator.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
