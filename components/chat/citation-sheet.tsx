"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Citation = {
  label: string;
  doctype: string;
  name: string;
  title: string;
  category?: string;
};

type FetchedSource = {
  body?: string;
  answer?: string;
  question?: string;
  version?: string;
  effective_from?: string;
  status?: string;
};

/**
 * Slides in over the chat drawer to show the full text of a cited HR
 * policy or FAQ. Fetches the source body via Frappe's public `get`
 * endpoint scoped to the caller's session, so RLS still applies —
 * clicking a citation for a policy the user isn't allowed to see would
 * fail closed rather than leak the body.
 */
export function CitationSheet({
  citation,
  open,
  onClose,
}: {
  citation: Citation;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<FetchedSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSource(null);
    const params = new URLSearchParams({
      doctype: citation.doctype,
      name: citation.name,
    });
    fetch(`/api/frappe/get?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((doc) => setSource(doc as FetchedSource))
      .catch((e) => setError(e.message ?? "Failed to load."))
      .finally(() => setLoading(false));
  }, [open, citation.doctype, citation.name]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="p-0">
        <SheetHeader>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle>{citation.title}</SheetTitle>
              <SheetDescription>
                {citation.doctype} · {citation.name}
                {citation.category ? ` · ${citation.category}` : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading source…
            </div>
          )}
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
              Couldn't load this source: {error}
            </p>
          )}
          {source && (
            <>
              {source.version && (
                <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  v{source.version}
                  {source.effective_from
                    ? ` · effective ${source.effective_from}`
                    : ""}
                </p>
              )}
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
                {source.question ? (
                  <>
                    <p className="mb-2 font-semibold">Q. {source.question}</p>
                    <p>{source.answer}</p>
                  </>
                ) : (
                  source.body
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
