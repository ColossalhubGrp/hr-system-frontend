import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "Ask · Analytics · Colossal HR",
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
export default function AnalyticsAskPage() {
  return <NaoChatFrame />;
}
