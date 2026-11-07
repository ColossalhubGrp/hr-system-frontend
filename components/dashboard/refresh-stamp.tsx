"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * "As at 09:42" + a manual refresh. Also re-fetches the page's server
 * data every five minutes so the dashboard quietly stays current
 * while it sits open on a wall screen or a second monitor.
 */
export function RefreshStamp({ asOf }: { asOf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [router]);

  const time = new Date(asOf).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={() => {
        setBusy(true);
        router.refresh();
        setTimeout(() => setBusy(false), 800);
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ash-500 transition hover:bg-canvas hover:text-ash-900 focus-ring"
      title="Refresh the figures"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      As at {time}
    </button>
  );
}
