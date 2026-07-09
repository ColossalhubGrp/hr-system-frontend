import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/frappe/session";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { frappeGuestCall } from "@/lib/frappe/guest-call";
import { RegisterForm, type CompanyOption } from "./register-form";

export const metadata: Metadata = {
  title: "Create account · Colossal HR",
};

async function loadCompanies(): Promise<CompanyOption[]> {
  const res = await frappeGuestCall<{
    success?: boolean;
    companies?: CompanyOption[];
  }>("recruitment_app.api.auth.list_registration_companies", {});
  if (!res.ok) return [];
  return res.data?.companies ?? [];
}

export default async function RegisterPage() {
  if (isAuthenticated()) {
    redirect("/dashboard");
  }
  const companies = await loadCompanies();
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
      <RegisterForm companies={companies} />
    </AuthShell>
  );
}
