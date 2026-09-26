"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { SelectInput } from "@/components/employee/form-bits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createLinkMasterAction } from "@/lib/frappe/masters/create-link-master";
import { cn } from "@/lib/cn";

type Kind = "industry" | "market-segment" | "language" | "price-list" | "tax-category" | "payment-terms-template";

const LABELS: Record<Kind, { singular: string; hint: string }> = {
  industry: { singular: "industry", hint: "e.g. Financial Services, Retail, Healthcare." },
  "market-segment": { singular: "market segment", hint: "e.g. Enterprise, SMB, Public sector." },
  language: { singular: "language", hint: "e.g. English, Shona, Ndebele." },
  "price-list": { singular: "price list", hint: "e.g. Standard Selling — currency defaults to USD; edit later if needed." },
  "tax-category": { singular: "tax category", hint: "e.g. Zero-rated, Standard VAT." },
  "payment-terms-template": { singular: "payment terms template", hint: "e.g. Net 30 — a single 100% row is added; edit later to split." },
};

/**
 * SelectInput plus a small "+ Add" affordance. Useful for Link fields
 * whose target master starts out empty on a fresh tenant, so users
 * aren't stuck staring at a "—" they can't populate. The added value
 * is inserted right away and selected in-place; the form still posts
 * a plain string via the underlying <select>.
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
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { singular, hint } = LABELS[kind];

  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  function submit() {
    const cleaned = typed.trim();
    if (!cleaned) {
      setError("A name is required.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await createLinkMasterAction(kind, cleaned);
      if (!res.ok) {
        setError(scrubJargon(res.error));
        return;
      }
      setOpts((prev) => (prev.includes(res.name) ? prev : [...prev, res.name].sort((a, b) => a.localeCompare(b))));
      setValue(res.name);
      setOpen(false);
    });
  }

  function scrubJargon(msg: string): string {
    const lowered = msg.toLowerCase();
    // Permission phrasings from the backend leak "doctype", "role permission",
    // "document" at users. Translate to plain language + a next step.
    if (
      /doctype\s+access/i.test(msg) ||
      /role\s+permission/i.test(msg) ||
      /not\s+permitted/i.test(lowered) ||
      /insufficient\s+permission/i.test(lowered)
    ) {
      return `You're not allowed to add a new ${singular} yet. Ask an administrator to grant you access.`;
    }
    if (/duplicate|already\s+exists/i.test(lowered)) {
      return "That name is already taken. Pick something else.";
    }
    if (/mandatory|missing\s+field/i.test(lowered)) {
      return "Something's missing. Try a simpler name and we'll fill the rest in.";
    }
    // If the raw message still contains internal terms, replace with a generic fallback.
    if (/\b(doctype|frappe|erpnext|traceback|exception)\b/i.test(msg)) {
      return "Couldn't add it. Please try again.";
    }
    return msg;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SelectInput
            id={id}
            name={name}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            options={opts.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-1 rounded-chip border border-input px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          title={`Add a new ${singular}`}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (pending ? null : setOpen(o))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {singular}</DialogTitle>
            <DialogDescription>{hint}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-add`} className="text-sm font-medium">
              Name
            </label>
            <input
              ref={inputRef}
              id={`${id}-add`}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={pending}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-destructive focus-visible:ring-destructive",
              )}
              placeholder={`New ${singular}…`}
            />
            {error && (
              <div className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
                pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700",
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Adding…" : `Add ${singular}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
