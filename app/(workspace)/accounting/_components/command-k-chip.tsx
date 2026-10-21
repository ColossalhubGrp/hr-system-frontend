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
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[11.5px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label="Open accounting search"
    >
      <Search className="h-3 w-3" />
      Search accounts, invoices, parties
      <kbd className="ml-0.5 inline-flex items-center rounded border border-input bg-muted px-1 py-0 font-mono text-[9px] text-muted-foreground">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
