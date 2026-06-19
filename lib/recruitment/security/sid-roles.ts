/**
 * Server-only helper: resolve a Frappe `sid` cookie to (user, AppRole).
 *
 * Used by middleware (proxy.ts) and the BFF (app/api/frappe/[...path]/route.ts)
 * to enforce permissions based on what the BACKEND says, not what a client
 * cookie claims.
 *
 * Caches per-sid for 60s so we don't hammer Frappe on every navigation;
 * cache invalidation happens on logout or naturally on TTL expiry.
 *
 * Replaces the old `parseRoleFromCookie` flow, which read a plain `app_role`
 * cookie that a malicious client could set to whatever they wanted.
 */

import type { AppRole } from "../role-routing";

// Honour either env var. smart_hr_web's .env.local uses FRAPPE_URL;
// the standalone recruitment app used FRAPPE_API_URL. Without this fallback
// every BFF call goes to the production default and 401s against a local sid.
const FRAPPE_API_URL =
  process.env.FRAPPE_URL ||
  process.env.FRAPPE_API_URL ||
  "http://localhost:8000";

type ResolvedSession = {
  user: string;
  role: AppRole | null;
  /** All Frappe roles the user holds, lower-cased for matching. */
  rawRoles: string[];
};

type CacheEntry = ResolvedSession & { fetchedAt: number };

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Map an SRS persona / Frappe role string to the recruitment app's coarser
 * 3-role bucket. Order matters: Candidate / Employer win over HR roles
 * because they're external personas and shouldn't get the HR workspace
 * even if they happen to also hold an HR role on the tenant.
 */
function mapToAppRole(rawRoles: string[]): AppRole | null {
  const lower = rawRoles.map((r) => r.toLowerCase());
  // External personas — recruitment-specific custom roles.
  if (lower.some((r) => r === "candidate" || r.includes("candidate"))) {
    return "candidate";
  }
  if (lower.some((r) => r === "employer" || r === "external hiring company")) {
    return "employer";
  }
  // Recruitment-allowed HR personas, per the SRS:
  //   HR Director, HR Manager, HR Operations, Recruiter, Hiring Manager,
  //   System Manager. NOT: regular Employee, Auditor, Data Steward,
  //   Executive Viewer, Payroll Officer, Alumni — they don't see
  //   recruitment.
  const HR_ALLOWED = new Set([
    "hr director",
    "hr manager",
    "hr operations",
    "hr user",
    "hr officer",
    "recruiter",
    "hiring manager",
    "system manager",
    "administrator",
  ]);
  if (lower.some((r) => HR_ALLOWED.has(r))) return "hr";
  return null;
}

/**
 * Resolve a sid cookie value to a session. Returns null if the sid is
 * missing, invalid, expired, or the user isn't authorised for any
 * recruitment app role.
 */
export async function resolveRoleFromSid(
  sid: string | undefined | null,
): Promise<ResolvedSession | null> {
  if (!sid || sid === "Guest") return null;

  const cached = cache.get(sid);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached;
  }

  try {
    // Single call: the whitelisted `my_roles` helper returns
    //   { user: "...", roles: [...] }
    // It runs as the sid's user, so the result is authoritative.
    const res = await fetch(
      `${FRAPPE_API_URL}/api/method/recruitment_app.api.me.my_roles`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `sid=${sid}`,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      cache.delete(sid);
      return null;
    }
    const payload = (await res.json()) as {
      message?: { user?: string; roles?: string[] };
    };
    const user = payload?.message?.user;
    const roles = payload?.message?.roles ?? [];
    if (!user || user === "Guest") {
      cache.delete(sid);
      return null;
    }
    const role = mapToAppRole(roles);
    const resolved: CacheEntry = {
      user,
      role,
      rawRoles: roles.map((r) => r.toLowerCase()),
      fetchedAt: now,
    };
    cache.set(sid, resolved);
    return resolved;
  } catch {
    // Network blip / Frappe down: don't cache; force a re-resolve next time.
    return null;
  }
}

/** Drop a cached session — call from logout. */
export function invalidateSidCache(sid: string | undefined | null) {
  if (sid) cache.delete(sid);
}
