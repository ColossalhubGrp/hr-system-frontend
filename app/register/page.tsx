import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/frappe/session";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account · Colossal HR",
};

export default function RegisterPage() {
  if (isAuthenticated()) {
    redirect("/dashboard");
  }
  return (
    <AuthShell
      title={
        <>
          One workspace.
          <br />
          The whole HR life-cycle.
        </>
      }
      subtitle="Create your Colossal HR account in under a minute and pick the tools your team actually needs."
    >
      <AuthBrandMark />
      <RegisterForm />
    </AuthShell>
  );
}
