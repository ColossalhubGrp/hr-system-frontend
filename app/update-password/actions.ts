"use server";

import { z } from "zod";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

export type UpdateState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const schema = z
  .object({
    key: z.string().trim().min(1, "This link looks broken — request a new one from the sign-in page."),
    password: z.string().min(8, "At least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

/**
 * Backing for the branded /update-password page the password-reset
 * email now points at (see recruitment_app/compat/user.py).
 *
 * Flow:
 *   1. User clicks link in email → lands here with `?key=`.
 *   2. User sets a new password.
 *   3. We POST to Frappe's native allow_guest=true
 *      `frappe.core.doctype.user.user.update_password` which
 *      validates the key, writes the new password, logs the user in
 *      server-side (we don't rely on that session), and returns a
 *      redirect URL (which we ignore in favour of our own /login).
 */
export async function updatePasswordAction(
  _prev: UpdateState,
  form: FormData,
): Promise<UpdateState> {
  const raw = {
    key: String(form.get("key") ?? ""),
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

  const res = await frappeGuestCall<string>(
    "frappe.core.doctype.user.user.update_password",
    {
      key: parsed.data.key,
      new_password: parsed.data.password,
    },
  );
  if (!res.ok) {
    // Frappe returns 410 + a plain string body like
    // "The reset link has expired" via `_server_messages` when
    // the key is bad / expired; frappeGuestCall surfaces it.
    return { error: res.error || "This link may be expired. Request a new one from the sign-in page." };
  }
  return { success: true };
}
