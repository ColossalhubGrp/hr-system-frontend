import "server-only";
import { serverEnv } from "@/lib/env";
import { frappeCookieHeader } from "./session";

type Method = "GET" | "POST";

type CallOpts = {
  /** Frappe whitelisted method path, e.g. `frappe.client.get_count` */
  method: string;
  args?: Record<string, unknown>;
  /** HTTP verb. Frappe accepts both for whitelisted reads. */
  verb?: Method;
  /** Per-request cache hint passed straight to `fetch`. */
  revalidate?: number | false;
  /**
   * Which identity to authenticate as.
   *  - `"service"` (default) — uses the API key in env. Right for tenant-wide
   *    aggregates that any user is allowed to see (dashboard headcount, etc).
   *  - `"user"` — forwards the user's `sid` cookie so Frappe applies their
   *    row-level permissions. Required for personalised data (their own
   *    profile, their team, their approvals).
   */
  as?: "service" | "user";
};

export class FrappeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "FrappeRequestError";
  }
}

/**
 * Server-side Frappe call. Uses token auth (`api_key:api_secret`) so credentials
 * never leave the Next.js server. The browser only sees the rendered HTML / the
 * Route Handler response.
 *
 * Frappe's `/api/method/<path>` returns `{ message: <payload> }` for whitelisted
 * methods, which we unwrap here.
 */
export async function frappeCall<T>(opts: CallOpts): Promise<T> {
  const env = serverEnv();
  const verb = opts.verb ?? "GET";
  const url = new URL(`/api/method/${opts.method}`, env.FRAPPE_URL);

  let body: BodyInit | undefined;
  if (verb === "GET" && opts.args) {
    for (const [k, v] of Object.entries(opts.args)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  } else if (opts.args) {
    // POST bodies — strip undefined too so we don't send `"or_filters": null`.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(opts.args)) {
      if (v !== undefined) clean[k] = v;
    }
    body = JSON.stringify(clean);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Frappe-Site-Name": new URL(env.FRAPPE_URL).hostname,
  };

  if ((opts.as ?? "service") === "user") {
    const cookie = frappeCookieHeader();
    if (!cookie) {
      throw new FrappeRequestError(
        `User-scoped call ${opts.method} attempted without a session cookie.`,
        401,
      );
    }
    headers.Cookie = cookie;
  } else {
    headers.Authorization = `token ${env.FRAPPE_API_KEY}:${env.FRAPPE_API_SECRET}`;
  }

  const res = await fetch(url, {
    method: verb,
    headers,
    body,
    // User-scoped calls are inherently per-request; never cache.
    next:
      (opts.as ?? "service") === "user"
        ? { revalidate: 0 }
        : opts.revalidate === false
        ? { revalidate: 0 }
        : { revalidate: opts.revalidate ?? 60 },
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new FrappeRequestError(
      `Call ${opts.method} failed: ${res.status} ${res.statusText}`,
      res.status,
      detail,
    );
  }

  const json = (await res.json()) as { message?: T };
  if (!("message" in json)) {
    throw new FrappeRequestError(
      `Call ${opts.method} returned an unexpected envelope.`,
      res.status,
      json,
    );
  }
  return json.message as T;
}
