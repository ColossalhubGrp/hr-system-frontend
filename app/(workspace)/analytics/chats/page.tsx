import type { Metadata } from "next";
import { NaoChatFrame } from "@/components/analytics/nao-chat-frame";

export const metadata: Metadata = {
  title: "Chats · Analytics · Colossal HR",
};

/**
 * All past chats, grouped by date. Nao doesn't ship a chats-list
 * page by default — that surface only lives in its sidebar (which
 * we hide entirely in embed mode). The fork's `colossal-embed`
 * branch adds `/chats` as a first-class route so this iframe has
 * something to point at.
 */
export default function AnalyticsChatsPage() {
  return <NaoChatFrame naoPath="/chats" />;
}
