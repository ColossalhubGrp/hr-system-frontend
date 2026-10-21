"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { globalSearchSuggest, type GlobalSearchHit } from "@/lib/frappe/global-search";

/**
 * Topbar search with live suggestions.
 *
 * Debounces the input 180ms, hits globalSearchSuggest, groups the hits
 * by entity type under compact section headers, and offers a "See all"
 * footer that submits to the full /search page. Keyboard: ↑/↓ to walk
 * the flattened list, Enter to open the highlighted hit (or jump to
 * /search when nothing's highlighted), Esc to close.
 */
export function TopbarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced server fetch. Keep the previous hits visible until the
  // new ones arrive to avoid an empty flash while typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setCursor(0);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await globalSearchSuggest(q, 4);
          setHits(res);
          setCursor(0);
        } catch {
          setHits([]);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href as Route);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(0, hits.length - 1)));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[cursor]) {
        go(hits[cursor].href);
      } else if (query.trim().length >= 2) {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}` as Route);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Group hits by their entity label for the dropdown.
  const grouped = groupHits(hits);
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search records"
        aria-label="Search records"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="topbar-search-results"
        className="h-8 w-[320px] rounded-md border border-input bg-card pl-8 pr-14 text-[13px] focus-ring"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded border border-input bg-background px-1 py-0 font-mono text-[9px] text-muted-foreground">
        Enter
      </kbd>

      {showDropdown && (
        <div
          id="topbar-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg"
        >
          {pending && hits.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 text-[12.5px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching…
            </div>
          )}
          {!pending && hits.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-3 text-[12.5px] text-muted-foreground">
              Nothing matched &ldquo;{query.trim()}&rdquo;.
            </div>
          )}
          {grouped.map((g) => (
            <div key={g.group}>
              <div className="border-t border-border px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground first:border-t-0">
                {g.group}
              </div>
              <ul>
                {g.hits.map((h) => {
                  const flatIdx = hits.indexOf(h);
                  const active = flatIdx === cursor;
                  return (
                    <li key={`${h.doctype}:${h.name}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(flatIdx)}
                        onClick={() => go(h.href)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] ${active ? "bg-primary/5 text-primary" : "hover:bg-muted/50"}`}
                      >
                        <span className="truncate text-foreground">{h.label}</span>
                        <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{h.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}` as Route}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[11.5px] font-semibold text-primary hover:bg-muted/50"
          >
            See all results for &ldquo;{query.trim()}&rdquo;
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function groupHits(hits: GlobalSearchHit[]): Array<{ group: string; hits: GlobalSearchHit[] }> {
  const map = new Map<string, GlobalSearchHit[]>();
  for (const h of hits) {
    const bucket = map.get(h.group) ?? [];
    bucket.push(h);
    map.set(h.group, bucket);
  }
  return Array.from(map.entries()).map(([group, hits]) => ({ group, hits }));
}
