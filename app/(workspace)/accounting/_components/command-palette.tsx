"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, Loader2, Receipt, FileSpreadsheet, Wallet, BookOpen,
  Layers, Users, Building2, ArrowRight, Command,
} from "lucide-react";
import { searchAccountingAction, type PaletteHit } from "./command-palette-actions";
import { SECTIONS, OVERVIEW_ID } from "../_lib/sections";
import { cn } from "@/lib/cn";

type Item =
  | { kind: "section"; label: string; href: string; sectionId: string }
  | { kind: "hit"; hit: PaletteHit };

const KIND_ICON: Record<PaletteHit["kind"], typeof Receipt> = {
  "Sales Invoice":    Receipt,
  "Purchase Invoice": FileSpreadsheet,
  "Payment Entry":    Wallet,
  "Journal Entry":    BookOpen,
  "Account":          Layers,
  "Customer":         Users,
  "Supplier":         Building2,
};

/**
 * Cmd-K palette for the Accounting module — opens on ⌘K / Ctrl+K from
 * anywhere under /accounting. Debounces 180ms before firing the
 * server-side fan-out search; always lists the 11 sections at the
 * top so admins can hop around sections even on an empty query.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PaletteHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl+K from anywhere mounts this component.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced server search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setHits([]); setCursor(0); return; }
    const t = setTimeout(() => {
      start(async () => {
        try {
          const res = await searchAccountingAction(q);
          setHits(res);
          setCursor(0);
        } catch {
          setHits([]);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  // Focus input on open; reset on close.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery(""); setHits([]); setCursor(0);
    }
  }, [open]);

  const sectionsFiltered = SECTIONS.filter((s) =>
    s.id !== OVERVIEW_ID &&
    (query.trim().length < 2 ||
      s.label.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const items: Item[] = [
    ...sectionsFiltered.map<Item>((s) => ({
      kind: "section",
      label: s.label,
      sectionId: s.id,
      href: `/accounting?s=${encodeURIComponent(s.id)}`,
    })),
    ...hits.map<Item>((h) => ({ kind: "hit", hit: h })),
  ];

  function jump(item: Item) {
    const href = item.kind === "section" ? item.href : item.hit.href;
    router.push(href as Route);
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = items[cursor];
      if (sel) jump(sel);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[24%] translate-y-0 max-w-xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Accounting command palette</DialogTitle>
        <DialogDescription className="sr-only">Search invoices, accounts, customers, suppliers, and sections.</DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={onInputKey}
            placeholder="Jump to a section · search invoices, accounts, customers…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
          {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="max-h-[400px] overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              {query.trim().length < 2
                ? "Type at least 2 characters to search records, or pick a section below."
                : pending
                  ? "Searching…"
                  : "No matches."}
            </div>
          ) : (
            <ul>
              {items.map((item, i) => (
                <li key={item.kind === "section" ? `s:${item.sectionId}` : `h:${item.hit.kind}:${item.hit.name}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => jump(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition",
                      i === cursor ? "bg-primary/[0.08]" : "hover:bg-muted/50",
                    )}
                  >
                    <ItemIcon item={item} active={i === cursor} />
                    <div className="min-w-0 flex-1">
                      {item.kind === "section" ? (
                        <>
                          <div className="truncate text-sm font-semibold text-foreground">{item.label}</div>
                          <div className="text-[11px] text-muted-foreground">Section · Accounting</div>
                        </>
                      ) : (
                        <>
                          <div className="truncate text-sm font-semibold text-foreground">{item.hit.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/70">{item.hit.kind}</span>
                            {item.hit.subtitle ? <> · {item.hit.subtitle}</> : null}
                          </div>
                        </>
                      )}
                    </div>
                    <ArrowRight className={cn("h-3.5 w-3.5", i === cursor ? "text-primary" : "text-muted-foreground")} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd><Kbd>↓</Kbd> to navigate · <Kbd>↵</Kbd> to open · <Kbd>Esc</Kbd> to close
          </span>
          <span className="inline-flex items-center gap-1">
            <Command className="h-3 w-3" /> <Kbd>K</Kbd> to toggle
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemIcon({ item, active }: { item: Item; active: boolean }) {
  if (item.kind === "section") {
    const Icon = SECTIONS.find((s) => s.id === item.sectionId)?.icon ?? Search;
    return (
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md",
        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  const Icon = KIND_ICON[item.hit.kind];
  return (
    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md",
      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[9px] text-foreground">
      {children}
    </span>
  );
}
