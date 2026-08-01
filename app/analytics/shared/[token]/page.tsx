import type { Metadata } from "next";
import { SharedTileView } from "@/components/analytics/dashboards/shared-tile-view";

export const metadata: Metadata = {
  title: "Shared analytics · Colossal HR",
  robots: { index: false, follow: false },   // shared links are private-by-token
};

export default async function SharedTilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedTileView token={token} />;
}
