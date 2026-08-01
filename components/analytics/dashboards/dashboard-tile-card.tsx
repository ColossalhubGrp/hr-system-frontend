"use client";

import { useState } from "react";
import { AlertTriangle, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { VizRenderer } from "@/components/analytics/viz-renderer";
import type { AnalyzeData } from "@/components/analytics/types";
import type {
  DashboardTile,
  RefreshTileResponse,
  RemoveTileResponse,
} from "./types";
import { ReviewBadge } from "./review-badge";
import { ShareTileModal } from "./share-tile-modal";

/**
 * One saved BI answer, rendered from the snapshot the backend
 * stored at save time. Reuses VizRenderer so the chart looks
 * identical to Ask (AI) — same toolbar (chart switcher, sort,
 * top-N, expand, PNG/CSV), same guardrails.
 *
 * Review handling:
 *   - When verdict === "reject", the primary narrative is the
 *     reviewer's revised version. The original + issue list are
 *     available in a collapsible details block below.
 *   - When verdict === "warn", primary narrative is the original;
 *     issues render in a collapsible so the executive isn't
 *     forced to read them if they don't care.
 *   - "approve" and "unreviewed" show narrative only, badge only.
 *
 * Freshness: if last_refreshed_at is older than stale_after_hours,
 * the age badge goes amber. Refresh re-runs the underlying question
 * with review=True (same latency as save).
 */
export function DashboardTileCard({
  tile,
  dashboardCode,
  editable,
  onChanged,
}: {
  tile: DashboardTile;
  dashboardCode: string;
  editable: boolean;
  onChanged: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryNarrative =
    tile.review_verdict === "reject" && tile.revised_narrative
      ? tile.revised_narrative
      : tile.narrative;

  const showOriginal =
    tile.review_verdict === "reject" && !!tile.narrative && tile.narrative !== primaryNarrative;

  const ageHours = _hoursSince(tile.last_refreshed_at);
  const stale = ageHours !== null && ageHours > tile.stale_after_hours;

  const doRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards/refresh-tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_code: dashboardCode,
          tile_position: tile.position,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | (RefreshTileResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  };

  const doRemove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards/remove-tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_code: dashboardCode,
          tile_position: tile.position,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | (RemoveTileResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  // Construct the AnalyzeData shape VizRenderer expects from the
  // stored snapshot. metric_code + name/unit/format are best-effort
  // reconstructed from the tile since the snapshot doesn't store
  // them all — we send safe defaults so the toolbar labels render.
  const vizData: AnalyzeData = {
    columns: tile.data_columns,
    rows: tile.data_rows,
    row_count: tile.data_row_count,
    metric: {
      code: tile.metric_code,
      // Titleize metric code fragment as a best-effort label.
      name: _labelize(tile.metric_code),
      unit: "",
      format: "decimal",
      supports_compare: false,
    },
  };

  return (
    <div className="rounded-xl border bg-card">
      {/* Header: question + review badge + refresh/remove */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {tile.question}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <ReviewBadge verdict={tile.review_verdict} />
            {tile.metric_code && (
              <code className="font-mono">{tile.metric_code}</code>
            )}
            <span title={tile.last_refreshed_at || ""} className={cn(stale && "text-amber-600")}>
              {_formatAge(ageHours)}
              {stale ? " · stale" : ""}
            </span>
          </div>
        </div>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7",
                tile.review_verdict === "approve"
                  ? "hover:text-primary"
                  : "text-muted-foreground/60",
              )}
              onClick={() => setShareOpen(true)}
              disabled={refreshing || removing}
              title={
                tile.review_verdict === "approve"
                  ? "Share this tile publicly"
                  : "Only approved tiles can be shared (v2-arch reviewer gate)"
              }
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={doRefresh}
              disabled={refreshing || removing}
              title="Re-run this question (with reviewer)"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
            {!confirmRemove ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:text-rose-600"
                onClick={() => setConfirmRemove(true)}
                disabled={refreshing || removing}
                title="Remove this tile"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setConfirmRemove(false)}
                  disabled={removing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-rose-500/40 px-2 text-[10px] text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                  onClick={doRemove}
                  disabled={removing}
                >
                  {removing ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  Confirm
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body: narrative + chart + optional issue trace */}
      <div className="space-y-3 p-4">
        {primaryNarrative && (
          <p className="text-sm text-foreground">{primaryNarrative}</p>
        )}
        {tile.data_row_count > 0 ? (
          <VizRenderer
            data={vizData}
            viz={tile.viz}
            question={tile.question}
            canCompare={false}
          />
        ) : (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            No rows in the snapshot.
          </p>
        )}
        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {error}
          </p>
        )}
        {editable && (
          <ShareTileModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            dashboardCode={dashboardCode}
            tilePosition={tile.position}
            reviewVerdict={tile.review_verdict}
          />
        )}
        {(tile.review_issues.length > 0 || showOriginal) && (
          <details className="rounded-md border border-muted">
            <summary className="cursor-pointer px-3 py-2 text-[10px] text-muted-foreground">
              Reviewer detail
              {tile.review_issues.length > 0 &&
                ` — ${tile.review_issues.length} issue${
                  tile.review_issues.length === 1 ? "" : "s"
                }`}
            </summary>
            <div className="border-t px-3 py-2 text-[11px]">
              {tile.review_issues.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {tile.review_issues.map((iss, i) => (
                    <li key={i} className="text-foreground">
                      <span className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[9px] uppercase">
                        {iss.kind}
                      </span>
                      {iss.description}
                    </li>
                  ))}
                </ul>
              )}
              {showOriginal && (
                <p className="mt-2 border-t pt-2 text-muted-foreground">
                  <span className="font-semibold uppercase text-[9px]">
                    Original narrative:
                  </span>{" "}
                  {tile.narrative}
                </p>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function _hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(t.getTime())) return null;
  return (Date.now() - t.getTime()) / (1000 * 60 * 60);
}

function _formatAge(hours: number | null): string {
  if (hours === null) return "never refreshed";
  if (hours < 1) return "refreshed just now";
  if (hours < 24) return `refreshed ${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `refreshed ${days}d ago`;
}

function _labelize(code: string): string {
  // hr.headcount.total → "Total"; simple label used only when we
  // don't have the real metric.name in the tile snapshot.
  const parts = code.split(".");
  const last = parts[parts.length - 1] || code;
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
