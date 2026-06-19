"use server";

import { z } from "zod";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

export type ResetState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const schema = z
  .object({
    email: z.string().trim().email(),
    token: z.string().trim().min(1),
    password: z.string().min(8, "At least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prev: ResetState,
  form: FormData,
): Promise<ResetState> {
  const raw = {
    email: String(form.get("email") ?? ""),
    token: String(form.get("token") ?? ""),
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
  const res = await frappeGuestCall<{ success?: boolean; message?: string }>(
    "recruitment_app.api.auth.reset_password",
    {
      email: parsed.data.email,
      token: parsed.data.token,
      new_password: parsed.data.password,
    },
  );
  if (!res.ok) return { error: res.error };
  if (res.data && res.data.success === false) {
    return { error: res.data.message ?? "Reset failed. The token may be expired." };
  }
  return { success: true };
}
