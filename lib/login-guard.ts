import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Per-device sign-in throttle: at most MAX_ATTEMPTS failed logins per
 * ATTEMPT_WINDOW_SECONDS, tracked in an HMAC-signed httpOnly cookie so
 * the browser can't edit its own counter. "Per device" here means per
 * browser profile — clearing cookies resets it, which is why Frappe's
 * own per-user lockout (3 fails → 15-minute lock, set in System
 * Settings) backs this up server-side.
 *
 * Only FAILED attempts count; a successful sign-in clears the counter.
 */

export const MAX_ATTEMPTS = 3;
export const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const COOKIE = "signin_guard";

type GuardState = { n: number; t: number }; // failures, window start (epoch s)

function key(): string {
  // Server-only, stable, never sent to the browser — suitable as an
  // HMAC key for a short-lived anti-tamper signature.
  return serverEnv().FRAPPE_API_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("hex");
}

function encode(state: GuardState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): GuardState | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload);
  try {
    if (
      mac.length !== expected.length ||
      !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    ) {
      return null; // forged or from a different deployment secret
    }
    const state = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as GuardState;
    if (typeof state.n !== "number" || typeof state.t !== "number") return null;
    return state;
  } catch {
    return null;
  }
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Minutes until this device may try again, or 0 when it's allowed. */
export function minutesUntilAllowed(): number {
  const state = decode(cookies().get(COOKIE)?.value);
  if (!state) return 0;
  const age = now() - state.t;
  if (age >= ATTEMPT_WINDOW_SECONDS) return 0; // window expired
  if (state.n < MAX_ATTEMPTS) return 0;
  return Math.max(1, Math.ceil((ATTEMPT_WINDOW_SECONDS - age) / 60));
}

/** Call after a FAILED sign-in. Starts/extends the device counter. */
export function recordFailedAttempt(): void {
  const prev = decode(cookies().get(COOKIE)?.value);
  const t = now();
  const fresh = !prev || t - prev.t >= ATTEMPT_WINDOW_SECONDS;
  const state: GuardState = fresh
    ? { n: 1, t }
    : { n: prev.n + 1, t: prev.t };
  cookies().set(COOKIE, encode(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ATTEMPT_WINDOW_SECONDS,
  });
}

/** Call after a SUCCESSFUL sign-in. */
export function clearAttempts(): void {
  cookies().delete(COOKIE);
}
