import type { Metadata } from "next";
import { AuthBrandMark, AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Forgot password · Colossal HR",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={
        <>
          Forgot your
          <br />
          password?
        </>
      }
      subtitle="It happens to all of us. Enter the email tied to your Colossal HR account and we'll send you a reset link."
    >
      <AuthBrandMark />
      <ForgotForm />
    </AuthShell>
  );
}
