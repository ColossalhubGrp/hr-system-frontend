"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";

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
    const value = pair.slice(eq + 1).trim();
    if (!name) continue;
    jar.set(name, value, {
      httpOnly: name === "sid",
      sameSite: "lax",
      path: "/",
      // Frappe gives short-lived session cookies; mirror that.
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  redirect("/dashboard");
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
