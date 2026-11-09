import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";
import { AnalyticsAsk } from "@/components/analytics/analytics-ask";
import { readTenantSite } from "@/lib/frappe/tenant";

export const metadata: Metadata = {
  title: "Ask · Analytics · Colossal Hub",
};

/**
 * Analytics chat is served by the nao runtime embedded in an iframe.
 * The user never sees the nao-rivers.colossalhub.com URL — Frappe
 * session cookies (Domain=.colossalhub.com) authenticate the iframe
 * silently via the nginx auth_request + SSO auto-provision sidecar.
 *
 * The previous in-house AnalyticsAsk component still lives at
 * components/analytics/analytics-ask.tsx as a fallback for
 * environments without nao provisioned — swap it back in here if
 * NEXT_PUBLIC_NAO_EMBED_URL is not configured for a target env.
 */
export default function AnalyticsAskPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = (searchParams?.q ?? "").trim();

  // Tenant sessions get the in-house Ask experience: the nao embed's
  // SSO sidecar only recognises control-site sessions, so a tenant
  // user would see a dead iframe. The in-house pipeline runs against
  // the tenant's own database via the tenant-routed analyze API.
  // Making nao itself tenant-aware is a later phase.
  if (readTenantSite()) {
    return <AnalyticsAsk initialQuestion={q || undefined} />;
  }

  // A question handed over from the dashboard rides into the embed
  // as nao's own ?q= search param; nao asks it on arrival.
  const naoPath = q ? `/?q=${encodeURIComponent(q)}` : "/";
  return <NaoChatFrame naoPath={naoPath} />;
}
