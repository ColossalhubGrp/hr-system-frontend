"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/**
 * Discovery chip for the ⌘K palette. Shows "Press ⌘K to search" on
 * Mac, "Ctrl+K" elsewhere. Click dispatches a synthetic key event
 * so the palette opens even for mouse users who don't know the
 * keyboard shortcut exists.
 */
export function CommandKChip() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  function open() {
    const e = new KeyboardEvent("keydown", {
      key: "k", metaKey: isMac, ctrlKey: !isMac, bubbles: true,
    });
    window.dispatchEvent(e);
  }

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex h-7 items-center gap-1.5 rounded-chip bg-surface/15 px-2.5 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-surface/25"
      aria-label="Open accounting search"
    >
      <Search className="h-3 w-3" />
      Search accounts, invoices, parties
      <kbd className="ml-0.5 inline-flex items-center rounded border border-white/20 bg-surface/10 px-1 py-0 font-mono text-[9px]">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
