import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Guest-allowed Frappe call (no sid required) used by register / forgot /
 * activate / reset flows. Frappe whitelisted methods marked `allow_guest=True`
 * answer via plain x-www-form-urlencoded; this helper wraps the call so the
 * Server Actions stay readable.
 *
 * Returns the parsed `.message` body on success (matching what Frappe writes
 * to whitelisted method responses) or a structured error.
 */
export type GuestCallSuccess<T> = { ok: true; data: T };
export type GuestCallFailure = { ok: false; error: string };
export type GuestCallResult<T> = GuestCallSuccess<T> | GuestCallFailure;

export async function frappeGuestCall<T = unknown>(
  method: string,
  args: Record<string, string | number | boolean | undefined>,
): Promise<GuestCallResult<T>> {
  const env = serverEnv();

  // Strip undefined args; Frappe is strict about them.
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(new URL(`/api/method/${method}`, env.FRAPPE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      cache: "no-store",
      redirect: "manual",
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not reach the server. Try again in a moment.",
    };
  }

  // Frappe surfaces business errors as 4xx with a JSON body; unwrap them.
  type FrappeJson = {
    message?: unknown;
    exception?: string;
    exc_type?: string;
    _server_messages?: string;
  };
  let json: FrappeJson | null = null;
  try {
    json = (await res.json()) as FrappeJson;
  } catch {
    // Fall through — non-JSON body means we can only report the HTTP status.
  }

  if (!res.ok) {
    const serverMsg = parseServerMessage(json?._server_messages);
    return {
      ok: false,
      error:
        serverMsg ??
        json?.exception ??
        `Server returned ${res.status}.`,
    };
  }

  // Whitelisted methods wrap their return value inside `message`.
  return { ok: true, data: (json?.message ?? json) as T };
}

/**
 * Frappe sends user-facing errors inside `_server_messages` — a JSON-encoded
 * array of JSON-encoded strings (yes, twice). Surface the first one if
 * available so the UI can show what actually went wrong.
 */
function parseServerMessage(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const first = JSON.parse(arr[0] ?? "") as { message?: string };
    return first?.message ?? null;
  } catch {
    return null;
  }
}
