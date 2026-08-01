"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { VizRenderer } from "@/components/analytics/viz-renderer";
import type { AnalyzeData } from "@/components/analytics/types";
import type { SharedTilePayload } from "./types";
import { ReviewBadge } from "./review-badge";

/**
 * Standalone public view of a shared dashboard tile. Renders
 * OUTSIDE the workspace shell (no sidebar, no auth chrome) so an
 * anonymous browser visitor sees the answer, the reviewer badge,
 * and a lightweight "Colossal HR" header — nothing else.
 *
 * Distinct error states from the backend:
 *   404 → unknown token / never existed
 *   410 → revoked or expired
 *   409 → underlying tile deleted since share was created
 * Each renders a targeted message so the visitor understands
 * whether to ask the sender for a new link vs give up.
 */
export function SharedTileView({ token }: { token: string }) {
  const [payload, setPayload] = useState<SharedTilePayload | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/shared/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError({
            status: res.status,
            message: body?.error ?? `HTTP ${res.status}`,
          });
        } else {
          setPayload((await res.json()) as SharedTilePayload);
        }
      } catch (err) {
        setError({
          status: 0,
          message: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading shared answer…
          </div>
        ) : error ? (
          <ErrorState status={error.status} message={error.message} />
        ) : payload ? (
          <TileBody payload={payload} />
        ) : null}
      </div>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b bg-card px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
          C
        </div>
        <span className="text-sm font-semibold text-foreground">Colossal HR</span>
        <span className="text-[11px] text-muted-foreground">· shared analytics</span>
      </div>
    </header>
  );
}

function TileBody({ payload }: { payload: SharedTilePayload }) {
  const { tile, dashboard } = payload;
  const primaryNarrative =
    tile.review_verdict === "reject" && tile.revised_narrative
      ? tile.revised_narrative
      : tile.narrative;

  const vizData: AnalyzeData = {
    columns: tile.data_columns,
    rows: tile.data_rows,
    row_count: tile.data_row_count,
    metric: {
      code: tile.metric_code,
      name: _labelize(tile.metric_code),
      unit: "",
      format: "decimal",
      supports_compare: false,
    },
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {dashboard.title} · shared by {dashboard.owner_user}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">
          {tile.question}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <ReviewBadge verdict={tile.review_verdict} />
          <code className="font-mono">{tile.metric_code}</code>
          {tile.last_refreshed_at && (
            <span>· snapshot from {tile.last_refreshed_at.split(" ")[0]}</span>
          )}
        </div>
      </div>

      {primaryNarrative && (
        <p className="text-sm text-foreground">{primaryNarrative}</p>
      )}

      {tile.data_row_count > 0 && (
        <VizRenderer
          data={vizData}
          viz={tile.viz}
          question={tile.question}
          canCompare={false}
        />
      )}

      <p className="border-t pt-3 text-[10px] text-muted-foreground">
        This is a read-only snapshot of an analytics answer generated
        by Colossal HR. The Adversarial Reviewer verdict at the top
        reflects the platform&apos;s automated check for factual
        grounding at snapshot time.
      </p>
    </div>
  );
}

function ErrorState({ status, message }: { status: number; message: string }) {
  const cfg =
    status === 410
      ? {
          title: "This link has been revoked",
          body:
            "The person who shared this answer has revoked the link. Ask them for a new one if you still need it.",
        }
      : status === 404
      ? {
          title: "Link not found",
          body:
            "This share link doesn't exist. Double-check that you copied the whole URL, or ask the sender for a new one.",
        }
      : status === 409
      ? {
          title: "Answer no longer available",
          body:
            "The dashboard tile this link pointed at has been removed. Ask the sender for a fresh share link.",
        }
      : {
          title: "Something went wrong",
          body: message,
        };
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-600" />
      <p className="text-sm font-semibold text-foreground">{cfg.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{cfg.body}</p>
    </div>
  );
}

function _labelize(code: string): string {
  const parts = code.split(".");
  const last = parts[parts.length - 1] || code;
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
