"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { frappeGuestCall } from "@/lib/frappe/guest-call";

type State = { error?: string };

/**
 * Posts the credentials directly to Frappe's `/api/method/login`. Frappe sets
 * a handful of cookies (`sid`, `user_id`, `system_user`, `full_name`,
 * `user_image`) — we copy each one onto the Next.js response with HttpOnly +
 * SameSite=Lax so the browser carries them on every workspace request.
 *
 * Returns a `State` on validation / auth failure so the form can render the
 * error in place; on success it redirects to `/dashboard`.
 */
export async function loginAction(
  _prev: State,
  form: FormData,
): Promise<State> {
  const usr = String(form.get("usr") ?? "").trim();
  const pwd = String(form.get("pwd") ?? "");

  if (!usr || !pwd) {
    return { error: "Enter your email and password." };
  }

  const env = serverEnv();
  const res = await fetch(new URL("/api/method/login", env.FRAPPE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ usr, pwd }).toString(),
    cache: "no-store",
    redirect: "manual",
  });

  if (res.status === 401 || res.status === 403) {
    return { error: "Incorrect email or password." };
  }
  if (!res.ok) {
    return { error: `Sign-in failed (${res.status}). Try again.` };
  }

  // Frappe sets cookies via Set-Cookie headers — copy them onto our response.
  const jar = cookies();
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : ([res.headers.get("set-cookie")].filter(Boolean) as string[]);

  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const eq = pair?.indexOf("=") ?? -1;
    if (!pair || eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const rawValue = pair.slice(eq + 1).trim();
    if (!name) continue;
    // Frappe URL-encodes cookie values (e.g. `full_name=HR%20Director`).
    // Next.js's cookies().set() encodes the value AGAIN when it serializes
    // the Set-Cookie header, so writing the raw Frappe value verbatim leaves
    // client-side `document.cookie` reads stuck at `HR%20Director` after one
    // decode. Decode here so the cookie carries the plain string and a
    // single decodeURIComponent on either side yields the correct value.
    let value = rawValue;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      // Leave value unchanged if Frappe ever sends a non-decodable token.
    }
    jar.set(name, value, {
      httpOnly: name === "sid",
      sameSite: "lax",
      path: "/",
      // Frappe gives short-lived session cookies; mirror that.
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  // Honor the `redirect` hidden field the form passes through — that's what
  // lets a visit to /recruitment/jobs (which middleware bounces to
  // /login?redirect=/recruitment/jobs) land back where it started after
  // sign-in. Restrict to same-origin, non-protocol-relative paths to block
  // open-redirect abuse.
  const requested = String(form.get("redirect") ?? "").trim();
  const target = isSafeInternalPath(requested) ? requested : "/dashboard";
  redirect(target);
}

function isSafeInternalPath(p: string): boolean {
  return (
    p.length > 0 &&
    p.startsWith("/") &&
    !p.startsWith("//") &&
    !p.startsWith("/\\")
  );
}

/**
 * Asks Frappe to resend the activation email for an account that hasn't
 * been activated yet. Called from the inline "Didn't receive…" block on the
 * login form. Backend method: recruitment_app.api.auth.resend_activation_email.
 */
export async function resendActivationAction(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "Enter your email first." };
  const res = await frappeGuestCall<{ success?: boolean; message?: string }>(
    "recruitment_app.api.auth.resend_activation_email",
    { email: trimmed },
  );
  if (!res.ok) return { ok: false, error: res.error };
  if (res.data && res.data.success === false) {
    return { ok: false, error: res.data.message ?? "Failed to resend activation." };
  }
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const jar = cookies();
  for (const c of jar.getAll()) {
    if (
      c.name === "sid" ||
      c.name === "user_id" ||
      c.name === "system_user" ||
      c.name === "full_name" ||
      c.name === "user_image"
    ) {
      jar.delete(c.name);
    }
  }
  redirect("/login");
}
