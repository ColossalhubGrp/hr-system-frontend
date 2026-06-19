"use server";

import { z } from "zod";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set when registration succeeded; the form renders the success screen. */
  success?: { email: string; message: string };
};

const schema = z.object({
  accountType: z.enum(["hr", "candidate"], {
    errorMap: () => ({ message: "Pick what you are registering as." }),
  }),
  fullName: z.string().trim().min(1, "Required."),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "At least 8 characters."),
  confirmPassword: z.string(),
});

export async function registerAction(
  _prev: RegisterState,
  form: FormData,
): Promise<RegisterState> {
  const raw = {
    accountType: String(form.get("accountType") ?? ""),
    fullName: String(form.get("fullName") ?? ""),
    company: String(form.get("company") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    password: String(form.get("password") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "");
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  if (data.password !== data.confirmPassword) {
    return {
      error: "Passwords don't match.",
      fieldErrors: { confirmPassword: "Doesn't match the password above." },
    };
  }
  const requiresCompany = data.accountType === "hr";
  if (requiresCompany && !data.company) {
    return {
      error: "Company is required for HR / Recruiter accounts.",
      fieldErrors: { company: "Required for HR accounts." },
    };
  }
  const companyValue = requiresCompany
    ? data.company!
    : data.company || "Individual Candidate";

  const res = await frappeGuestCall<{
    success?: boolean;
    message?: string;
    email?: string;
    error?: string;
  }>("recruitment_app.api.auth.register", {
    email: data.email,
    password: data.password,
    full_name: data.fullName,
    company: companyValue,
    role: data.accountType,
    phone: data.phone,
  });

  if (!res.ok) return { error: res.error };
  if (!res.data?.success) {
    return { error: res.data?.message ?? res.data?.error ?? "Registration failed." };
  }
  return {
    success: {
      email: res.data.email ?? data.email,
      message:
        res.data.message ??
        "Account created. Check your inbox to activate it.",
    },
  };
}
