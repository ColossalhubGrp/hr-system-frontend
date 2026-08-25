import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "AI Settings · Analytics · Colossal HR",
};

/**
 * Nao's own settings surface (account / project / experimental /
 * memory / MCP endpoint / …) exposed as a Colossal outer-nav entry.
 * Same SSO bootstrap + embed-mode chrome overrides as Ask (AI) — we
 * hide nao's sidebar in embed mode, so this is the only way for a
 * Colossal user to reach toggles like "Dangerous write permissions"
 * that live on the Experimental tab.
 *
 * Landing on /settings/experimental (not the settings index) because
 * that's the tab where the dangerous-write flag lives; the in-page
 * sub-nav lets the user reach the other settings tabs from there.
 */
export default function AnalyticsSettingsPage() {
  return <NaoChatFrame naoPath="/settings/experimental" />;
}
