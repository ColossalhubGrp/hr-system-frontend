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
      className="inline-flex h-9 items-center gap-2 rounded-chip bg-white/15 px-3 text-xs font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-white/25"
      aria-label="Open accounting search"
    >
      <Search className="h-3.5 w-3.5" />
      Search accounts, invoices, parties
      <kbd className="ml-1 inline-flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
