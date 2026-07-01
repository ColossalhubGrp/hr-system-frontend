/**
 * Path → app code mapping. Client-safe; mirrors the server-side catalog
 * in `lib/subscriptions/server.ts`. Duplicated so the sidebar filter
 * doesn't need a per-render network call.
 *
 * Keep both lists in sync — there's an obvious tradeoff vs a single
 * source of truth, but the catalog has <20 entries and changes rarely.
 */

const PATH_TO_APP: Array<{ prefix: string; code: string }> = [
  { prefix: "/recruitment", code: "recruitment" },
  { prefix: "/payroll", code: "payroll" },
  { prefix: "/loans", code: "loans" },
  { prefix: "/analytics", code: "analytics" },
  { prefix: "/audit", code: "audit" },
  { prefix: "/data-steward", code: "data_steward" },
  { prefix: "/accounting", code: "erpnext_modules" },
  { prefix: "/sales", code: "erpnext_modules" },
  { prefix: "/stock", code: "erpnext_modules" },
  { prefix: "/buying", code: "erpnext_modules" },
  { prefix: "/manufacturing", code: "erpnext_modules" },
  { prefix: "/hr", code: "hr" },
  { prefix: "/employee", code: "hr" },
  { prefix: "/team", code: "hr" },
  { prefix: "/me", code: "core" },
  { prefix: "/dashboard", code: "core" },
  { prefix: "/admin", code: "core" },
  { prefix: "/settings", code: "core" },
];

/** Most-specific prefix wins. Returns null if the path isn't gated. */
export function appCodeForPath(pathname: string): string | null {
  let best: string | null = null;
  let bestLen = 0;
  for (const { prefix, code } of PATH_TO_APP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (prefix.length > bestLen) {
        best = code;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}
