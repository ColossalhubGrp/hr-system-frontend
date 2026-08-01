"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type {
  DashboardSummary,
  ListDashboardsResponse,
  SaveAnswerResponse,
} from "./types";
import { ReviewBadge } from "./review-badge";

/**
 * Modal that appears when the user hits "Save to dashboard" on an
 * Ask (AI) answer. Two modes in one screen:
 *
 *   - Pick an existing dashboard from the list of ones they can
 *     edit (their own + shared_with_roles with write).
 *   - Create a new dashboard by typing a title.
 *
 * Save always re-runs the question with review=True on the
 * backend, so we render a loading state that mentions "running the
 * reviewer" — sets user expectation for the ~5-6s round-trip.
 *
 * On success we show the resulting review verdict + a link into
 * the destination dashboard. `onSaved` fires so the caller can
 * refresh a list, close the dialog, etc.
 */
export function SaveToDashboardModal({
  open,
  onClose,
  question,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** The question to save. Owned by the caller — the modal doesn't edit it. */
  question: string;
  onSaved?: (result: SaveAnswerResponse) => void;
}) {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveAnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close so re-open starts clean
      setLoading(false);
      setMode("pick");
      setSelectedCode("");
      setNewTitle("");
      setSaving(false);
      setResult(null);
      setError(null);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/dashboards", { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as ListDashboardsResponse;
        // Only show dashboards the user can edit — read-only ones
        // (Executive Viewer visibility) can't accept new tiles.
        const editable = payload.dashboards.filter((d) => d.mine);
        setDashboards(editable);
        if (editable.length === 0) {
          // Auto-flip to create mode when they have no editable
          // dashboards yet — one less click.
          setMode("create");
        } else {
          setSelectedCode(editable[0].code);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboards.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const doSave = async () => {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === "pick"
          ? { question, dashboard_code: selectedCode }
          : { question, dashboard_title: newTitle.trim() || "My Dashboard" };
      const res = await fetch("/api/analytics/dashboards/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as
        | (SaveAnswerResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      if (!payload) throw new Error("Empty response.");
      setResult(payload);
      onSaved?.(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !!question &&
    !saving &&
    ((mode === "pick" && !!selectedCode) ||
      (mode === "create" && !!newTitle.trim()));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4" />
            Save to dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            Question: <span className="font-medium text-foreground">{question}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Saving runs the Adversarial Reviewer on the answer — takes
            about 5-6 seconds. The verdict lands on the tile so shared
            viewers see whether the answer was cleared.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading dashboards…
            </div>
          ) : result ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Saved to {result.dashboard_title}
                </p>
                <ReviewBadge verdict={result.review_verdict} />
              </div>
              <p className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
                Tile added at position {result.tile_position + 1}.
              </p>
              <a
                href={`/analytics/dashboards/${result.dashboard_code}`}
                className="mt-2 inline-block text-[11px] text-primary underline"
              >
                Open dashboard →
              </a>
            </div>
          ) : (
            <>
              {/* Mode picker — only shown when there ARE editable
                  dashboards to pick from; otherwise we already
                  auto-flipped to create mode. */}
              {dashboards.length > 0 && (
                <div className="flex gap-1 rounded-md border p-1">
                  <ModeTab
                    active={mode === "pick"}
                    onClick={() => setMode("pick")}
                    label="Existing"
                  />
                  <ModeTab
                    active={mode === "create"}
                    onClick={() => setMode("create")}
                    label="Create new"
                    icon={<Plus className="mr-1 h-3 w-3" />}
                  />
                </div>
              )}

              {mode === "pick" && dashboards.length > 0 && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-foreground">
                    Pick a dashboard
                  </label>
                  <select
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    disabled={saving}
                    className="block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  >
                    {dashboards.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.title} ({d.tile_count} tile
                        {d.tile_count === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === "create" && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-foreground">
                    New dashboard title
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={saving}
                    className="block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    placeholder="e.g. Weekly HR Board"
                    autoFocus
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    A stable code (slug) is derived from the title
                    automatically and used in the dashboard URL.
                  </p>
                </div>
              )}

              {error && (
                <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button size="sm" onClick={doSave} disabled={!canSave}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save + Review
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center rounded px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
