"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";

type State = { error?: string };

/**
 * Sign out an alumni session and return them to the alumni-specific
 * sign-in page (not the main /login). Used by the alumni portal header.
 */
export async function alumniLogoutAction(): Promise<void> {
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
  redirect("/alumni/login");
}

const ALUMNI_COOKIES = new Set([
  "sid",
  "user_id",
  "system_user",
  "full_name",
  "user_image",
]);

const ROLE_ALUMNI = "Alumni";
const ACTIVE_WORKFORCE_ROLES = new Set([
  "Employee",
  "HR Director",
  "HR Manager",
  "HR Operations",
  "HR User",
  "HR Officer",
  "Line Manager",
  "Recruiter",
  "Hiring Manager",
  "Payroll Officer",
  "Finance Reviewer",
  "Executive Viewer",
  "Data Steward",
  "IT Admin",
  "Auditor",
  "System Manager",
]);

/**
 * Walled-garden sign-in for alumni. Authenticates against the same Frappe
 * backend as `/login`, but after a successful auth we VERIFY the new session
 * holds only the `Alumni` role and none of the active-workforce roles. If a
 * current employee tries to sign in via this gate, we clear the cookies and
 * surface a clear error pointing them to `/login`.
 *
 * The gate is two-layer:
 *   1. After login, server-side role check (here).
 *   2. /alumni/layout.tsx redirects non-alumni-only sessions to `/`.
 */
export async function alumniLoginAction(
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

  // Capture the Set-Cookie headers so we can hand them straight to Frappe
  // for the role check, and copy to our own response on success.
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : ([res.headers.get("set-cookie")].filter(Boolean) as string[]);

  // Build the cookie header to verify the new sid against my_roles.
  const cookiePairs: string[] = [];
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    if (!pair) continue;
    cookiePairs.push(pair.trim());
  }

  let roles: string[] = [];
  try {
    const probe = await fetch(
      new URL(
        "/api/method/recruitment_app.api.me.my_roles",
        env.FRAPPE_URL,
      ),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: cookiePairs.join("; "),
        },
        cache: "no-store",
      },
    );
    if (probe.ok) {
      const body = (await probe.json()) as {
        message?: { roles?: string[] };
      };
      roles = body.message?.roles ?? [];
    }
  } catch {
    // Treat probe failure as suspicious — refuse to seat the cookie.
    return {
      error:
        "We signed you in but couldn't verify your alumni status. Try again or use the main login.",
    };
  }

  const hasAlumni = roles.includes(ROLE_ALUMNI);
  const hasActiveRole = roles.some((r) => ACTIVE_WORKFORCE_ROLES.has(r));

  if (!hasAlumni) {
    return {
      error:
        "This sign-in is for alumni only. If you're a current employee, please use the main login.",
    };
  }
  if (hasActiveRole) {
    return {
      error:
        "Your account still has active employee access. Please sign in via the main login instead.",
    };
  }

  // Alumni-only confirmed — seat the cookies.
  const jar = cookies();
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const eq = pair?.indexOf("=") ?? -1;
    if (!pair || eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name || !ALUMNI_COOKIES.has(name)) continue;
    jar.set(name, value, {
      httpOnly: name === "sid",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  redirect("/alumni");
}
