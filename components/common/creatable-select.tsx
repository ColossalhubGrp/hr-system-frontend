"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Loader2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createLinkMasterAction } from "@/lib/frappe/masters/create-link-master";
import { cn } from "@/lib/cn";

type Kind = "industry" | "market-segment" | "language" | "price-list" | "tax-category" | "payment-terms-template";

const LABELS: Record<Kind, { singular: string }> = {
  industry: { singular: "industry" },
  "market-segment": { singular: "market segment" },
  language: { singular: "language" },
  "price-list": { singular: "price list" },
  "tax-category": { singular: "tax category" },
  "payment-terms-template": { singular: "payment terms template" },
};

/**
 * Frappe-style Link combobox: click to open a search dropdown with the
 * existing options plus a "+ Create new '<typed>'" row at the bottom
 * that inserts the master with sensible defaults, adds it to the list
 * and selects it — all without leaving the field.
 *
 * A hidden input carries the selected value into the surrounding form.
 */
export function CreatableSelect({
  id,
  name,
  kind,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  kind: Kind;
  defaultValue?: string | null;
  options: string[];
}) {
  const [opts, setOpts] = useState<string[]>(() => {
    const seen = new Set(options);
    const merged = [...options];
    if (defaultValue && !seen.has(defaultValue)) merged.unshift(defaultValue);
    return merged;
  });
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const { singular } = LABELS[kind];

  useEffect(() => {
    if (open) {
      setQuery("");
      setError(null);
      const t = setTimeout(() => searchRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter((o) => o.toLowerCase().includes(q));
  }, [opts, query]);

  const trimmed = query.trim();
  const exactMatch = trimmed && opts.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const showCreate = Boolean(trimmed) && !exactMatch;

  function pick(next: string) {
    setValue(next);
    setOpen(false);
  }

  function clear() {
    setValue("");
    setOpen(false);
  }

  function scrubJargon(msg: string): string {
    const lowered = msg.toLowerCase();
    if (
      /doctype\s+access/i.test(msg) ||
      /role\s+permission/i.test(msg) ||
      /not\s+permitted/i.test(lowered) ||
      /insufficient\s+permission/i.test(lowered)
    ) {
      return `You're not allowed to add a new ${singular} yet. Ask an administrator to grant you access.`;
    }
    if (/duplicate|already\s+exists/i.test(lowered)) return "That name is already taken. Pick something else.";
    if (/mandatory|missing\s+field/i.test(lowered)) return "Something's missing. Try a simpler name.";
    if (/\b(doctype|frappe|erpnext|traceback|exception)\b/i.test(msg)) return "Couldn't add it. Please try again.";
    return msg;
  }

  function create() {
    if (!trimmed) return;
    setError(null);
    start(async () => {
      const res = await createLinkMasterAction(kind, trimmed);
      if (!res.ok) {
        setError(scrubJargon(res.error));
        return;
      }
      setOpts((prev) => (prev.includes(res.name) ? prev : [...prev, res.name].sort((a, b) => a.localeCompare(b))));
      setValue(res.name);
      setOpen(false);
    });
  }

  return (
    <>
      <input type="hidden" id={id} name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{value || "—"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[--radix-popover-trigger-width] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreate) {
                  e.preventDefault();
                  create();
                } else if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  pick(filtered[0]);
                }
              }}
              placeholder={`Search or add ${singular}…`}
              className="h-8 w-full rounded-sm border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={pending}
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={clear}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs italic text-muted-foreground hover:bg-muted/40"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">No matches.</div>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/40",
                  o === value && "bg-muted/30 font-medium",
                )}
              >
                <Check className={cn("h-3.5 w-3.5", o === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{o}</span>
              </button>
            ))}
          </div>

          {showCreate && (
            <div className="border-t">
              <button
                type="button"
                onClick={create}
                disabled={pending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {pending ? "Adding…" : (
                  <>Create new {singular}: <span className="font-semibold">"{trimmed}"</span></>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-1.5 border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
