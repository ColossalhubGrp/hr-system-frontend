"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardDetail } from "./types";
import { DashboardTileCard } from "./dashboard-tile-card";

/**
 * Detail view: metadata header + all tiles rendered as full chart
 * cards. Tiles stack vertically at MVP width — grid layout is a
 * Phase 4c follow-up when tile-size persistence lands.
 *
 * Permissions: read-only viewers see no refresh/remove buttons on
 * tiles; the `editable` flag from the backend drives that.
 */
export function DashboardDetail({ code }: { code: string }) {
  const [dash, setDash] = useState<DashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/dashboards/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 403) {
          throw new Error("You don't have permission to view this dashboard.");
        }
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setDash((await res.json()) as DashboardDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [code]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-2">
      <div>
        <Link
          href={"/analytics/dashboards" as Route}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All dashboards
        </Link>
      </div>

      {loading && !dash ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading dashboard…
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          {error}
        </div>
      ) : dash ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Business Intelligence / Dashboards
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                {dash.title}
              </h2>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {dash.code} · owner: {dash.owner_user}
                {dash.shared_with_roles.length > 0 &&
                  ` · shared with ${dash.shared_with_roles.join(", ")}`}
              </p>
              {dash.description && (
                <p className="mt-2 max-w-xl text-xs text-muted-foreground">
                  {dash.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
              {!dash.editable && (
                <span className="self-center text-[11px] italic text-muted-foreground">
                  read-only
                </span>
              )}
            </div>
          </header>

          {dash.tiles.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No tiles on this dashboard yet
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Go to Ask (AI), ask a question, then click &quot;Save to
                dashboard&quot; on the answer.
              </p>
              <Link
                href={"/analytics/ask" as Route}
                className="mt-3 inline-block text-[11px] text-primary underline"
              >
                Open Ask (AI) →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {dash.tiles.map((t) => (
                <DashboardTileCard
                  key={t.position}
                  tile={t}
                  dashboardCode={dash.code}
                  editable={dash.editable}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
