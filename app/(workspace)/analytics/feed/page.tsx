import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";
import { readTenantSite } from "@/lib/frappe/tenant";

export const metadata: Metadata = {
  title: "Feed · Analytics · Colossal Hub",
};

/**
 * Nao's Feed surface (team activity / shared updates) exposed as its
 * own outer-sidebar entry under Business Intelligence. Same SSO
 * bootstrap + embed-mode chrome overrides as Ask (AI) and Stories.
 */
export default function AnalyticsFeedPage() {
  // nao surfaces are control-site only for now: the SSO sidecar does
  // not recognise tenant sessions, so tenant users land on the
  // in-house Ask instead of a dead iframe.
  if (readTenantSite()) redirect("/analytics/ask");
  return <NaoChatFrame naoPath="/feed" />;
}
