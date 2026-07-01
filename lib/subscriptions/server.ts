import "server-only";
import { cache } from "react";
import { frappeCall } from "@/lib/frappe/client";
import type {
  AppDefinition,
  CompanySubscription,
  SubscriptionRow,
} from "./types";

const METHOD = "tenant_manager.subscriptions.api.subscriptions";

/**
 * The current request's subscription, fetched once and reused via
 * React's request-scoped cache. The sidebar, every layout gate, and
 * every page that checks `hasApp()` share a single backend call per
 * request.
 */
export const getMySubscription = cache(
  async (): Promise<CompanySubscription> => {
    try {
      const res = await frappeCall<CompanySubscription>({
        method: `${METHOD}.get_my_subscription`,
        args: {},
        as: "user",
      });
      return normalize(res);
    } catch {
      // On failure, fall back to "everything enabled" so a backend
      // hiccup doesn't blank the workspace. The layout gates still
      // re-check server-side, so this is a UI-only fallback.
      return {
        company: null,
        plan_name: null,
        is_active: 1,
        valid_until: null,
        apps: [],
        has: {},
      };
    }
  },
);

/** True if the current user's company has the app enabled. */
export async function hasApp(code: string): Promise<boolean> {
  const sub = await getMySubscription();
  return Boolean(sub.has?.[code]);
}

/**
 * Reverse lookup: which app gates a route prefix? Returns the app code
 * or null when the path isn't gated.
 *
 * Mirrors the backend `app_for_path` (which is what set_subscription
 * checks against). The catalog is duplicated client-side so the sidebar
 * filter doesn't need a round-trip per nav item.
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
  // /me, /dashboard, /admin, /settings → core (always-on)
  { prefix: "/me", code: "core" },
  { prefix: "/dashboard", code: "core" },
  { prefix: "/admin", code: "core" },
  { prefix: "/settings", code: "core" },
];

export function appForPath(pathname: string): string | null {
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

// ───── Admin surface (only callable by IT Admin / System Manager) ─────

export async function listApps(): Promise<AppDefinition[]> {
  try {
    const res = await frappeCall<{ apps: AppDefinition[] }>({
      method: `${METHOD}.list_apps`,
      args: {},
      as: "user",
    });
    return res.apps ?? [];
  } catch {
    return [];
  }
}

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  try {
    const res = await frappeCall<{ subscriptions: SubscriptionRow[] }>({
      method: `${METHOD}.list_subscriptions`,
      args: {},
      as: "user",
    });
    return res.subscriptions ?? [];
  } catch {
    return [];
  }
}

export async function getCompanySubscription(
  company: string,
): Promise<CompanySubscription> {
  const res = await frappeCall<CompanySubscription>({
    method: `${METHOD}.get_my_subscription`,
    args: { company },
    as: "user",
  });
  return normalize(res);
}

export async function setCompanySubscription(input: {
  company: string;
  apps: string[];
  planName?: string;
  isActive?: boolean;
  validUntil?: string;
}): Promise<void> {
  await frappeCall({
    method: `${METHOD}.set_subscription`,
    args: {
      company: input.company,
      apps: input.apps,
      plan_name: input.planName,
      is_active: input.isActive,
      valid_until: input.validUntil ?? "",
    },
    as: "user",
    verb: "POST",
  });
}

// ──────────────────────────────────────────────────────────────────────

function normalize(r: CompanySubscription): CompanySubscription {
  return {
    ...r,
    is_active: r.is_active === 1 || r.is_active === true ? 1 : 0,
    apps: (r.apps ?? []).map((a) => ({
      ...a,
      enabled: Boolean(a.enabled),
    })),
    has: r.has ?? {},
  };
}
