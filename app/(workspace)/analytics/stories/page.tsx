import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";
import { readTenantSite } from "@/lib/frappe/tenant";

export const metadata: Metadata = {
  title: "Stories · Analytics · Colossal Hub",
};

/**
 * Nao's Stories surface (saved / shareable analyses) exposed as its
 * own outer-sidebar entry under Business Intelligence. The iframe
 * targets /stories on the nao runtime; the same SSO bootstrap +
 * ?embed=1 chrome overrides apply.
 */
export default function AnalyticsStoriesPage() {
  // nao surfaces are control-site only for now: the SSO sidecar does
  // not recognise tenant sessions, so tenant users land on the
  // in-house Ask instead of a dead iframe.
  if (readTenantSite()) redirect("/analytics/ask");
  return <NaoChatFrame naoPath="/stories" />;
}
