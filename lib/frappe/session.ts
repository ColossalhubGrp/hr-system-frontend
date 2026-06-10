import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Reads the user's Frappe session cookies from the incoming request. We carry
 * `sid` for authentication, plus `user_id` / `full_name` because Frappe sends
 * them URL-encoded and we surface the decoded values in the topbar without
 * an extra API hop.
 */
export type Session = {
  sid: string | undefined;
  userId: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

export function readSession(): Session {
  const jar = cookies();
  const sid = jar.get("sid")?.value;
  const userId = decodeURIComponent(jar.get("user_id")?.value ?? "");
  const fullName = decodeURIComponent(jar.get("full_name")?.value ?? "");
  const avatarRaw = decodeURIComponent(jar.get("user_image")?.value ?? "");
  return {
    sid,
    userId: userId || null,
    fullName: fullName || null,
    avatarUrl: avatarRaw || null,
  };
}

export function hasSession() {
  return Boolean(readSession().sid);
}

/** True if the current sid belongs to a real user (not Guest). */
export function isAuthenticated() {
  const { sid, userId } = readSession();
  return Boolean(sid) && userId !== null && userId !== "Guest";
}

/**
 * Build the cookie header forwarded to Frappe on user-scoped calls.
 * The full set the browser holds is the source of truth — we re-emit every
 * Frappe cookie (sid, user_id, system_user, full_name, etc.) verbatim so the
 * server treats the request as if the user were calling it directly.
 */
export function frappeCookieHeader(): string {
  const jar = cookies();
  const pairs: string[] = [];
  for (const c of jar.getAll()) {
    if (
      c.name === "sid" ||
      c.name === "user_id" ||
      c.name === "system_user" ||
      c.name === "full_name" ||
      c.name === "user_image"
    ) {
      pairs.push(`${c.name}=${c.value}`);
    }
  }
  return pairs.join("; ");
}

/** Absolute Frappe URL — handy for redirects and login form actions. */
export function frappeBaseUrl() {
  return serverEnv().FRAPPE_URL;
}

/**
 * Resolves the absolute URL of an avatar Frappe gave us. Frappe stores user
 * images as either a relative `/files/...` path or an external URL — we
 * normalise to absolute so `<img>` works without further plumbing.
 */
export function resolveAvatarUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return new URL(raw, serverEnv().FRAPPE_URL).toString();
  return null;
}
