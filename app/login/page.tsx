import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/frappe/session";
import { AuthShell, AuthBrandMark } from "@/components/auth/auth-shell";
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

  return (
    <AuthShell
      title={
        <>
          One workspace
          <br />
          for your whole HR.
        </>
      }
      subtitle="People, time, performance, payroll, and recruitment — unified, with manager approvals and policy controls built in."
    >
      <AuthBrandMark />
      <header className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight text-ink-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your Colossal HR account.
        </p>
      </header>
      <LoginForm redirectTo={searchParams?.redirect} />
    </AuthShell>
  );
}
