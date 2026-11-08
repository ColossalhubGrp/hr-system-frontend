import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * Multi-tenant routing (Model 2: one Frappe site per tenant).
 *
 * At login the server resolves which tenant site the user belongs to
 * (control-site Tenant Membership directory) and pins it in an
 * httpOnly cookie. Every server-side Frappe call then targets that
 * site. No cookie — or an invalid one — falls back to the control
 * site (env.FRAPPE_URL), which keeps every existing user working
 * exactly as before.
 */

export const TENANT_COOKIE = "tenant_site";

/** Only single-label subdomains of our own parent domain are ever
 * honoured — a tampered cookie cannot point the server anywhere else. */
const SITE_RE = /^[a-z0-9][a-z0-9-]{1,61}\.colossalhub\.com$/;

export function isValidTenantSite(value: string): boolean {
  return SITE_RE.test(value);
}

/** The tenant site pinned on this request, or null for control-site users. */
export function readTenantSite(): string | null {
  const raw = cookies().get(TENANT_COOKIE)?.value ?? "";
  return isValidTenantSite(raw) ? raw : null;
}

/** Absolute base URL for Frappe calls on this request. */
export function frappeBaseForRequest(): string {
  const site = readTenantSite();
  return site ? `https://${site}` : serverEnv().FRAPPE_URL;
}

// ── per-tenant service credentials ─────────────────────────────────
// Tenant sites have their own service identity (installed at
// provisioning); the control site hands it to us on request,
// authenticated with OUR control-site service token. Cached in module
// memory — serverless instances recycle, so a short TTL is plenty.

type ServiceCreds = { apiKey: string; apiSecret: string };

const credsCache = new Map<string, { creds: ServiceCreds; expires: number }>();
const CREDS_TTL_MS = 10 * 60 * 1000;

export async function serviceCredsFor(site: string | null): Promise<ServiceCreds> {
  const env = serverEnv();
  if (!site) {
    return { apiKey: env.FRAPPE_API_KEY, apiSecret: env.FRAPPE_API_SECRET };
  }

  const hit = credsCache.get(site);
  if (hit && hit.expires > Date.now()) return hit.creds;

  const url = new URL(
    "/api/method/tenant_manager.api.routing.tenant_access",
    env.FRAPPE_URL,
  );
  url.searchParams.set("site", site);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `token ${env.FRAPPE_API_KEY}:${env.FRAPPE_API_SECRET}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Tenant credential lookup for ${site} failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    message?: { api_key?: string; api_secret?: string };
  };
  const apiKey = json.message?.api_key;
  const apiSecret = json.message?.api_secret;
  if (!apiKey || !apiSecret) {
    throw new Error(`Tenant credential lookup for ${site} returned no keys.`);
  }
  const creds = { apiKey, apiSecret };
  credsCache.set(site, { creds, expires: Date.now() + CREDS_TTL_MS });
  return creds;
}
