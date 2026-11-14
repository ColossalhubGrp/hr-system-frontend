"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import { frappeCall } from "@/lib/frappe/client";
import { TENANT_COOKIE } from "@/lib/frappe/tenant";

/**
 * "Sign out of all devices" — kills every Frappe session for the
 * caller (including this one), then clears this browser's cookies and
 * lands on the login page. Other devices die the moment they make
 * their next request.
 */
export async function signOutEverywhereAction(): Promise<void> {
  try {
    await frappeCall({
      method: "recruitment_app.api.security.logout_all_sessions",
      verb: "POST",
      args: {},
      as: "user",
    });
  } catch {
    // Sessions may already be gone — still clear local state below.
  }
  const env = serverEnv();
  const jar = cookies();
  const managed = [
    "sid", "user_id", "system_user", "full_name", "user_image",
    "last_seen", TENANT_COOKIE,
  ];
  for (const name of managed) {
    jar.delete(name);
    if (env.COOKIE_DOMAIN && name !== TENANT_COOKIE) {
      jar.set(name, "", { path: "/", domain: env.COOKIE_DOMAIN, maxAge: 0 });
    }
  }
  redirect("/login");
}
