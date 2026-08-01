"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type {
  CreateShareResponse,
  DashboardTileShare,
  ListSharesResponse,
  ReviewVerdict,
} from "./types";

/**
 * Modal for managing share links on ONE tile.
 *
 *   - Lists existing shares filtered to this tile (with revoke button)
 *   - Big "Create share link" button. Backend gates on the tile's
 *     reviewer verdict being "approve"; the button is disabled +
 *     tooltip'd when it isn't, so we never round-trip to a refusal.
 *   - On create, copies the URL to clipboard + shows the copy state.
 *   - On revoke, immediately updates the list without a full refetch.
 *
 * Public URL uses window.location.origin so the copied link is
 * absolute — a Steward can paste it into an email or WhatsApp
 * without editing.
 */
export function ShareTileModal({
  open,
  onClose,
  dashboardCode,
  tilePosition,
  reviewVerdict,
}: {
  open: boolean;
  onClose: () => void;
  dashboardCode: string;
  tilePosition: number;
  reviewVerdict: ReviewVerdict;
}) {
  const [shares, setShares] = useState<DashboardTileShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  const canShare = reviewVerdict === "approve";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/dashboards/shares/list?dashboard_code=${encodeURIComponent(dashboardCode)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ListSharesResponse;
      // Filter to THIS tile only — list_shares returns everything for the dashboard.
      setShares(payload.shares.filter((s) => s.tile_position === tilePosition));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shares.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setShares([]);
      setError(null);
      setJustCopied(null);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dashboardCode, tilePosition]);

  const doCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards/shares/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboard_code: dashboardCode,
          tile_position: tilePosition,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | (CreateShareResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      // Optimistically copy the new URL to clipboard so the Steward
      // can paste it immediately.
      const absoluteUrl = `${window.location.origin}${body.public_url}`;
      await _copyToClipboard(absoluteUrl);
      setJustCopied(body.token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreating(false);
    }
  };

  const doRevoke = async (token: string) => {
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards/shares/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Share this tile
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
          {!canShare && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              This tile can&apos;t be shared publicly — the Adversarial
              Reviewer verdict is <b>{reviewVerdict}</b>. Only tiles
              with an <b>approve</b> verdict are shareable (v2-arch
              rule). Refresh the tile to re-run the reviewer, then
              try again.
            </p>
          )}
          {canShare && (
            <p className="text-xs text-muted-foreground">
              Anyone with a share link can view this tile&apos;s
              snapshot (no login required). Links are revocable and
              audited — access counts + last-accessed timestamps
              appear below.
            </p>
          )}

          {error && (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              {error}
            </p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading shares…
            </div>
          )}

          {!loading && shares.length === 0 && canShare && (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No share links yet. Create one below.
            </p>
          )}

          {shares.length > 0 && (
            <ul className="space-y-2">
              {shares.map((s) => (
                <li
                  key={s.token}
                  className={cn(
                    "rounded-md border p-2",
                    s.is_live ? "border-input bg-card" : "border-muted bg-muted/20 opacity-70",
                  )}
                >
                  <ShareRow
                    share={s}
                    justCopied={justCopied === s.token}
                    onCopy={async () => {
                      const absoluteUrl = `${window.location.origin}${s.public_url}`;
                      await _copyToClipboard(absoluteUrl);
                      setJustCopied(s.token);
                    }}
                    onRevoke={() => doRevoke(s.token)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
            Close
          </Button>
          {canShare && (
            <Button size="sm" onClick={doCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
              Create share link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareRow({
  share,
  justCopied,
  onCopy,
  onRevoke,
}: {
  share: DashboardTileShare;
  justCopied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const absoluteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${share.public_url}`
      : share.public_url;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          value={absoluteUrl}
          readOnly
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 rounded border border-input bg-background px-2 py-1 font-mono text-[10px] text-foreground"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onCopy}
          disabled={!share.is_live}
          title={justCopied ? "Copied!" : "Copy link"}
        >
          {justCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
        {share.is_live && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:text-rose-600"
            onClick={onRevoke}
            title="Revoke this link"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
        <span>created {_shortDate(share.created_at)}</span>
        <span>by {share.created_by}</span>
        <span>{share.access_count} view{share.access_count === 1 ? "" : "s"}</span>
        {share.last_accessed_at && (
          <span>last {_shortDate(share.last_accessed_at)}</span>
        )}
        {share.revoked_at && (
          <span className="text-rose-600">revoked {_shortDate(share.revoked_at)}</span>
        )}
      </div>
    </div>
  );
}

async function _copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Some browsers block clipboard on non-HTTPS — fall back to a
    // hidden textarea + execCommand. Users on the VPS are always
    // on HTTPS so this branch is rarely hit in production.
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
  }
}

function _shortDate(iso: string | null): string {
  if (!iso) return "";
  return iso.split(" ")[0];
}
