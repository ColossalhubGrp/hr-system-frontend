"use client";

import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ChevronLeft, RefreshCw } from "lucide-react";

/**
 * Workspace-level error boundary for the Accounting module. Replaces
 * Next.js's bare "Application error: a server-side exception has
 * occurred" screen with something readable, keeping the user's
 * navigation intact and surfacing the digest so we can tie back to a
 * runtime log line.
 */
export default function AccountingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-base font-semibold">This page couldn&apos;t load</h1>
        </div>
        <p className="text-foreground">
          Something broke while rendering this screen. The underlying error:
        </p>
        <pre className="w-full overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs text-destructive">
          {error.message || "No message was captured."}
        </pre>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{error.digest}</span> — send this to support if the problem persists.
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white hover:bg-ink-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href={"/accounting" as Route}
            className="inline-flex h-9 items-center rounded-chip border border-input px-3 text-sm font-semibold hover:bg-muted/40"
          >
            Go to Accounting
          </Link>
        </div>
      </div>
    </div>
  );
}
