"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { RelationshipListResponse, SemanticRelationship } from "./types";

/**
 * Steward view of Semantic Relationships. Renders:
 *
 *   Filter chips (Heuristic Pending default because that's the
 *   actionable tier), search box, table with Approve/Reject actions
 *   inline. Rejection opens a small reason input; the reason is
 *   required so the profiler never re-proposes the same wrong guess.
 *
 * Read-only for non-Steward viewers; buttons are hidden when
 * response.editable is false.
 */

type ConfKey = "Heuristic Pending" | "Approved" | "Link" | "Rejected" | "all";

const CHIP_ORDER: ConfKey[] = [
  "Heuristic Pending",
  "Approved",
  "Link",
  "Rejected",
  "all",
];

export function RelationshipsExplorer() {
  const [data, setData] = useState<RelationshipListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConfKey>("Heuristic Pending");
  const [q, setQ] = useState("");

  const load = async (conf: ConfKey = filter) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/analytics/semantics/relationships", window.location.origin);
      if (conf !== "all") url.searchParams.set("confidence", conf);
      url.searchParams.set("limit", "500");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as RelationshipListResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.relationships;
    const needle = q.trim().toLowerCase();
    return data.relationships.filter(
      (r) =>
        r.from_doctype.toLowerCase().includes(needle)
        || r.from_field.toLowerCase().includes(needle)
        || r.to_doctype.toLowerCase().includes(needle)
        || r.reason.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const counts = data?.counts;

  return (
    <div className="space-y-4">
      {/* Filter chips + search + reload */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIP_ORDER.map((k) => (
          <FilterChip
            key={k}
            label={k === "all" ? "All" : k}
            n={
              k === "all"
                ? counts?.total ?? 0
                : counts?.[k as keyof typeof counts] ?? 0
            }
            active={filter === k}
            onClick={() => setFilter(k)}
            tone={chipTone(k)}
          />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by doctype / field / reason…"
              className="h-8 w-[280px] rounded-md border border-input bg-background pl-7 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => load(filter)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Table — outer div scrolls horizontally so narrow viewports can still
          reach the Actions column; the Actions column itself is sticky-pinned
          to the right so it stays visible even during scroll. */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">From</th>
              <th className="px-2 py-2 text-left font-semibold" />
              <th className="px-2 py-2 text-left font-semibold">To</th>
              <th className="px-2 py-2 text-left font-semibold">Confidence</th>
              <th className="px-2 py-2 text-left font-semibold">Reason</th>
              {data?.editable && (
                <th className="sticky right-0 bg-muted/40 px-4 py-2 text-right font-semibold shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.12)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data?.editable ? 6 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {loading ? "Loading…" : (
                    filter === "Heuristic Pending"
                      ? "No pending relationships. Steward queue is clear."
                      : "No relationships match this filter."
                  )}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <RelationshipRow
                  key={r.name}
                  rel={r}
                  editable={data!.editable}
                  onChanged={() => load(filter)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Approved and Link relationships are used by the Semantic Query Engine when Ask
        needs to reach a field on a joined table. Heuristic Pending rows are proposals
        from the profiler awaiting your review; Rejected rows are never re-proposed on
        later profiler passes.
      </p>
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────

function RelationshipRow({
  rel,
  editable,
  onChanged,
}: {
  rel: SemanticRelationship;
  editable: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState(rel.rejected_reason || "");
  const [err, setErr] = useState<string | null>(null);

  const canAct = editable && (rel.confidence === "Heuristic Pending" || rel.confidence === "Rejected");

  const approve = async () => {
    setBusy("approve");
    setErr(null);
    try {
      const res = await fetch("/api/analytics/semantics/relationships/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rel.name }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setErr("Reason is required.");
      return;
    }
    setBusy("reject");
    setErr(null);
    try {
      const res = await fetch("/api/analytics/semantics/relationships/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rel.name, reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setRejectOpen(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <tr className="border-t hover:bg-muted/20">
        <td className="whitespace-nowrap px-4 py-2 font-medium text-foreground">
          {rel.from_doctype}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">
          <span className="font-mono">.{rel.from_field}</span>
          <ArrowRight className="ml-1 inline h-3 w-3" />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-foreground">
          {rel.to_doctype}
          <span className="font-mono text-muted-foreground">.{rel.to_field}</span>
        </td>
        <td className="px-2 py-2">
          <ConfPill c={rel.confidence} />
        </td>
        <td className="max-w-[240px] px-2 py-2 text-muted-foreground">
          <div className="truncate" title={rel.reason}>
            {rel.reason || "—"}
          </div>
          {rel.confidence === "Rejected" && rel.rejected_reason && (
            <div className="mt-1 truncate text-rose-700 dark:text-rose-300" title={rel.rejected_reason}>
              rejected: {rel.rejected_reason}
            </div>
          )}
        </td>
        {editable && (
          <td className="sticky right-0 whitespace-nowrap bg-card px-4 py-2 text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.12)]">
            {canAct && !rejectOpen && (
              <div className="inline-flex gap-1.5">
                {rel.confidence !== "Approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={approve}
                    disabled={busy !== null}
                    className="h-7 px-2 text-[11px]"
                    title="Approve — the query engine will use this JOIN"
                  >
                    {busy === "approve" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Approve
                  </Button>
                )}
                {rel.confidence !== "Rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectOpen(true)}
                    disabled={busy !== null}
                    className="h-7 px-2 text-[11px] border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                    title="Reject — never re-proposed on later profiler runs"
                  >
                    <X className="mr-1 h-3 w-3" /> Reject
                  </Button>
                )}
              </div>
            )}
          </td>
        )}
      </tr>
      {rejectOpen && (
        <tr className="border-t bg-rose-500/[0.03]">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why is this wrong? (required — stops the profiler re-proposing)"
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-[11px]"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectOpen(false);
                  setReason(rel.rejected_reason || "");
                  setErr(null);
                }}
                disabled={busy !== null}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                onClick={reject}
                disabled={busy !== null || !reason.trim()}
              >
                {busy === "reject" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <X className="mr-1 h-3 w-3" />
                )}
                Confirm reject
              </Button>
            </div>
          </td>
        </tr>
      )}
      {err && (
        <tr>
          <td colSpan={6} className="px-4 py-1 text-[11px] text-rose-700 dark:text-rose-300">
            {err}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Small pieces ───────────────────────────────────────────────────

function FilterChip({
  label,
  n,
  active,
  onClick,
  tone,
}: {
  label: string;
  n: number;
  active: boolean;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary/[0.08] text-primary"
          : "border-input bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone)} />
      {label}
      <span className={cn("font-semibold tabular-nums", active ? "text-primary" : "text-foreground")}>
        {n}
      </span>
    </button>
  );
}

function ConfPill({ c }: { c: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        pillClass(c),
      )}
    >
      {c}
    </span>
  );
}

function chipTone(c: string): string {
  switch (c) {
    case "Link": return "bg-emerald-500";
    case "Approved": return "bg-emerald-500";
    case "Heuristic Pending": return "bg-amber-500";
    case "Rejected": return "bg-rose-500";
    default: return "bg-muted-foreground";
  }
}

function pillClass(c: string): string {
  switch (c) {
    case "Link":
    case "Approved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "Heuristic Pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Rejected":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-muted text-foreground";
  }
}
