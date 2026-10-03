"use client";

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

const KEY = "colossal.accounting.setupDismissed";

/**
 * Client wrapper that lets a user Dismiss the setup checklist for
 * their browser (localStorage per-origin). Keeps the server-rendered
 * checklist intact — this only controls visibility. If the user clears
 * site data OR dismisses it on another browser, it'll come back.
 */
export function DismissibleSetup({ children }: { children: React.ReactNode }) {
  // Start as visible on first paint — if we hydrate and localStorage
  // says "dismissed", we hide it. This avoids a flash of the big card
  // on repeat visits.
  const [visible, setVisible] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "1") setVisible(false);
    } catch { /* non-fatal */ }
    setHydrated(true);
  }, []);

  function dismiss() {
    try { window.localStorage.setItem(KEY, "1"); } catch { /* non-fatal */ }
    setVisible(false);
  }

  function restore() {
    try { window.localStorage.removeItem(KEY); } catch { /* non-fatal */ }
    setVisible(true);
  }

  if (!hydrated) return <div className="relative">{children}</div>;

  if (!visible) {
    return (
      <button
        type="button"
        onClick={restore}
        className="inline-flex items-center gap-1.5 self-start rounded-chip border border-primary/20 bg-primary/[0.04] px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Show first-time setup
      </button>
    );
  }

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss setup checklist"
        title="Dismiss — bring it back from the Overview tab anytime."
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
