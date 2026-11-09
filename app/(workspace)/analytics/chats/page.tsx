import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";
import { readTenantSite } from "@/lib/frappe/tenant";

export const metadata: Metadata = {
  title: "Chats · Analytics · Colossal Hub",
};

/**
 * All past chats, grouped by date. Nao doesn't ship a chats-list
 * page by default — that surface only lives in its sidebar (which
 * we hide entirely in embed mode). The fork's `colossal-embed`
 * branch adds `/chats` as a first-class route so this iframe has
 * something to point at.
 */
export default function AnalyticsChatsPage() {
  // nao surfaces are control-site only for now: the SSO sidecar does
  // not recognise tenant sessions, so tenant users land on the
  // in-house Ask instead of a dead iframe.
  if (readTenantSite()) redirect("/analytics/ask");
  return <NaoChatFrame naoPath="/chats" />;
}
