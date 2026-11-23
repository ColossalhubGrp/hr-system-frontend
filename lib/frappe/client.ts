import "server-only";
import { frappeCookieHeader } from "./session";
import { frappeBaseForRequest, readTenantSite, serviceCredsFor } from "./tenant";

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
   *  - `"guest"` — sends NO auth header. Frappe treats the request as
   *    Guest, so this only reaches methods decorated with
   *    `@frappe.whitelist(allow_guest=True)`. Right for public endpoints
   *    like share-link resolution where the token IS the auth and there
   *    is no "correct" user identity to send.
   */
  as?: "service" | "user" | "guest";
};

/** Roles allowed to trigger service-key (System Manager) calls. Back-
 *  office personas only — rank-and-file Employee / Alumni / Guest
 *  sessions must never reach the service identity, whatever server
 *  action they invoke. Kept deliberately broader than any one page's
 *  gate: the page gates decide what renders, this decides what the
 *  service key will do. */
const SERVICE_ESCALATION_ROLES = new Set([
  "System Manager",
  "HR Director", "HR Manager", "HR Operations", "HR User", "HR Officer",
  "HR Admin", "HR Assistant",
  "Payroll Officer", "Payroll Manager",
  "Accounts Manager", "Accounts User", "Finance Reviewer",
  "Recruiter", "Hiring Manager", "Line Manager",
  "IT Admin", "Data Steward", "Auditor", "Executive Viewer",
]);

async function assertServiceEscalationAllowed(method: string): Promise<void> {
  // No session at all → a system context (login flow, background
  // revalidation), not a user riding the key. Middleware already
  // blocks unauthenticated requests to every workspace route.
  const { readSession } = await import("./session");
  const { userId } = readSession();
  if (!userId || userId === "Guest") return;

  // Dynamic import avoids a module cycle (roles.ts uses frappeCall
  // with as:"user", which never re-enters this guard).
  const { getMyAccess } = await import("./roles");
  const access = await getMyAccess();
  for (const role of access.roles) {
    if (SERVICE_ESCALATION_ROLES.has(role)) return;
  }
  // Technical detail goes to the server log (with the correlation id
  // when one exists); the person sees plain words, never method paths
  // or codes.
  let rid = "";
  try {
    const { headers: reqHeaders } = await import("next/headers");
    rid = reqHeaders().get("x-request-id") ?? "";
  } catch {
    /* no request scope */
  }
  console.error(
    `[service-guard] blocked ${method} for ${userId}${rid ? ` (request ${rid})` : ""}`,
  );
  throw new FrappeRequestError(
    "You don't have access to this part of Colossal Hub. " +
      "If you think you should, ask your administrator.",
    403,
  );
}

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
  const verb = opts.verb ?? "GET";
  // Multi-tenant: the signed-in user's tenant site (httpOnly cookie set
  // at login) decides which Frappe site answers; control-site users
  // keep env.FRAPPE_URL.
  const base = frappeBaseForRequest();
  const url = new URL(`/api/method/${opts.method}`, base);

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
    "X-Frappe-Site-Name": new URL(base).hostname,
  };

  // Correlation id (observability): forward the middleware-assigned
  // request id so a slow or failing Frappe call can be matched to the
  // exact page view that triggered it. headers() throws outside a
  // request scope (build-time renders) — correlation simply doesn't
  // apply there.
  try {
    const { headers: reqHeaders } = await import("next/headers");
    const rid = reqHeaders().get("x-request-id");
    if (rid) headers["X-Request-Id"] = rid;
  } catch {
    /* no request scope */
  }

  const as = opts.as ?? "service";
  if (as === "user") {
    const cookie = frappeCookieHeader();
    if (!cookie) {
      throw new FrappeRequestError(
        `User-scoped call ${opts.method} attempted without a session cookie.`,
        401,
      );
    }
    headers.Cookie = cookie;
  } else if (as === "guest") {
    // Deliberately no Authorization header — Frappe will treat this
    // as Guest and only allow it through if the target method has
    // allow_guest=True. Right for public share-link resolution and
    // anywhere else that a token-in-URL is the real auth.
  } else {
    // BOLA/BFLA guard (2026-11-14 security review): service calls run
    // as System Manager, and any signed-in user can invoke any server
    // action regardless of which page links to it — so escalating to
    // the service key is only allowed when the SESSION USER holds an
    // elevated role. Plain employee / alumni sessions are refused
    // here, at the single chokepoint every service call passes
    // through.
    await assertServiceEscalationAllowed(opts.method);
    // Service identity is per site: tenant sites carry their own key
    // pair (fetched from the control plane, cached); the control site
    // uses the env pair as always.
    const creds = await serviceCredsFor(readTenantSite());
    headers.Authorization = `token ${creds.apiKey}:${creds.apiSecret}`;
  }

  const res = await fetch(url, {
    method: verb,
    headers,
    body,
    // User- and guest-scoped calls are never cached at the fetch
    // layer: Next's fetch cache key doesn't include the Cookie
    // header, so a cached user-scoped response could leak between
    // signed-in users. Speedups for those come from
    //   (a) React cache() dedupe within a single render, and
    //   (b) the client-side Router Cache on same-user back-nav,
    // which is per-browser and keyed by session automatically.
    // Service-scoped calls (system-token-authenticated background
    // reads) are safe to cache and default to 60s.
    next:
      as === "user" || as === "guest"
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
    // Frappe failures are otherwise invisible in production (the user
    // only sees a toast). Log the method, status and Frappe's own
    // exception string to the server log so a 500 is diagnosable
    // without a special deploy. Frappe puts the exception class +
    // message in `detail.exception`; never log the request body (PII).
    try {
      const exc =
        detail && typeof detail === "object"
          ? (detail as { exception?: string }).exception ?? ""
          : String(detail).slice(0, 300);
      if (res.status >= 500 || exc) {
        // eslint-disable-next-line no-console
        console.error(
          `[frappeCall] ${verb} ${opts.method} → ${res.status} ` +
            `(as=${as}) ${String(exc).slice(0, 400)}`,
        );
      }
    } catch {
      /* logging must never mask the real error */
    }
    throw new FrappeRequestError(
      `Call ${opts.method} failed: ${res.status} ${res.statusText}`,
      res.status,
      detail,
    );
  }

  // Frappe wraps whitelisted-method responses as `{message: <payload>}`.
  // Void methods (anything that returns Python `None`) produce a
  // response with NO `message` key — that's fine, return undefined and
  // let the caller decide. Only error responses (non-2xx) were caught
  // above; here we just unwrap whatever's present.
  const json = (await res.json()) as { message?: T };
  return (json?.message ?? undefined) as T;
}
