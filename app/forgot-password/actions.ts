"use server";

import { z } from "zod";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

export type ForgotState = {
  error?: string;
  /** Set on success; the form renders the "check your inbox" screen. */
  success?: { email: string };
};

const schema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export async function forgotPasswordAction(
  _prev: ForgotState,
  form: FormData,
): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: String(form.get("email") ?? "") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  const res = await frappeGuestCall<{ success?: boolean; message?: string }>(
    "recruitment_app.api.auth.request_password_reset",
    { email: parsed.data.email },
  );
  // We intentionally surface success whether the email exists or not — same
  // anti-enumeration posture as the recruitment app — but if Frappe explicitly
  // failed (e.g. SMTP down), report it.
  if (!res.ok) return { error: res.error };
  if (res.data && res.data.success === false) {
    return { error: res.data.message ?? "Failed to send the reset link." };
  }
  return { success: { email: parsed.data.email } };
}
