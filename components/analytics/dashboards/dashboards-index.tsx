"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, LayoutDashboard, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
  CreateDashboardResponse,
  DashboardSummary,
  ListDashboardsResponse,
} from "./types";

/**
 * List view for all dashboards the caller can see. Owner + shared_
 * with_roles + Executive-Viewer visibility all show here; the "mine"
 * flag on each row drives the badge + which ones the New/Delete/
 * Refresh actions apply to.
 *
 * Empty state has a big "Create dashboard" button — most users
 * land here for the first time with zero dashboards, and that CTA
 * matters more than any table styling.
 */
export function DashboardsIndex() {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as ListDashboardsResponse;
      setDashboards(payload.dashboards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doCreate = async () => {
    if (!newTitle.trim()) return;
    setCreatingBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/dashboards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const body = (await res.json().catch(() => null)) as
        | (CreateDashboardResponse & { error?: string })
        | null;
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body) throw new Error("Empty response.");
      setNewTitle("");
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setCreatingBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-2">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Business Intelligence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Dashboards</h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Saved BI answers grouped into dashboards. Each tile carries
            the Adversarial Reviewer&apos;s verdict at save time — so
            shared viewers see whether an answer was cleared before
            reading the number.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New dashboard
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          {error}
        </p>
      )}

      {/* Inline create form — cheaper than a modal for a single field */}
      {creating && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-3">
          <label className="mb-1 block text-[11px] font-medium text-foreground">
            Title
          </label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={creatingBusy}
            className="block w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            placeholder="e.g. Weekly HR Board"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim() && !creatingBusy) doCreate();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewTitle(""); }} disabled={creatingBusy}>
              Cancel
            </Button>
            <Button size="sm" onClick={doCreate} disabled={!newTitle.trim() || creatingBusy}>
              {creatingBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Create
            </Button>
          </div>
        </div>
      )}

      {!loading && dashboards.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <LayoutDashboard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No dashboards yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Save an Ask (AI) answer to a dashboard — the &quot;Save to
            dashboard&quot; button appears next to any answer.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create your first dashboard
          </Button>
        </div>
      )}

      {dashboards.length > 0 && (
        <ul className="space-y-2">
          {dashboards.map((d) => (
            <li key={d.code}>
              <DashboardRow d={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardRow({ d }: { d: DashboardSummary }) {
  const href = `/analytics/dashboards/${d.code}` as Route;
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
            {d.mine && (
              <span className="rounded-full border bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                Mine
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate pl-5 font-mono text-[10px] text-muted-foreground">
            {d.code}
          </p>
          {d.description && (
            <p className="mt-1 line-clamp-2 pl-5 text-[11px] text-muted-foreground">
              {d.description}
            </p>
          )}
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <div className="font-semibold text-foreground">
            {d.tile_count} tile{d.tile_count === 1 ? "" : "s"}
          </div>
          {d.modified && <div>modified {d.modified.split(" ")[0]}</div>}
          <div className={cn("truncate", d.mine && "text-primary")}>
            owner: {d.owner_user}
          </div>
        </div>
      </div>
    </Link>
  );
}
