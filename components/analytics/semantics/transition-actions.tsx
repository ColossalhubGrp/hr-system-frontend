"use client";

import { useState } from "react";
import { Check, Loader2, Send, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { FormulaVersion } from "./types";

/**
 * Row of workflow-transition buttons for a single Formula Version.
 * Which buttons appear depends on the current status:
 *
 *   Candidate    → "Submit for review"
 *   Under Review → "Approve"  /  "Send back"  /  "Reject"
 *   others       → no actions
 *
 * The backend gates each transition by role (author for the first
 * Candidate→Under-Review hop, Data Steward for the rest) and by
 * legality. `can_transition` on the row is a hint from the server so
 * we can grey out buttons the server would reject anyway.
 */

export function TransitionActions({
  version,
  onDone,
}: {
  version: FormulaVersion;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!version.can_transition) return null;

  const call = async (
    to_status: string,
    label: string,
    reason?: string,
  ) => {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch("/api/analytics/semantics/formula-version/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: version.name, to_status, reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed.");
    } finally {
      setBusy(null);
    }
  };

  if (rejectOpen) {
    return (
      <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/5 p-3 text-[11px]">
        <p className="mb-1.5 font-semibold text-rose-800 dark:text-rose-200">
          Reject this version
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
          placeholder="Why is this being rejected? (required — prevents the same shape from being re-suggested)"
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px]"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Rejection is final. To re-consider later, author a new Candidate.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason("");
              }}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={!rejectReason.trim() || busy !== null}
              onClick={() => call("Rejected", "Reject", rejectReason)}
            >
              {busy === "Reject" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const buttons: React.ReactNode[] = [];
  if (version.status === "Candidate") {
    buttons.push(
      <ActionBtn
        key="submit"
        label="Submit for review"
        icon={<Send className="mr-1.5 h-3.5 w-3.5" />}
        busy={busy === "Submit"}
        onClick={() => call("Under Review", "Submit")}
      />,
    );
  }
  if (version.status === "Under Review") {
    buttons.push(
      <ActionBtn
        key="approve"
        label="Approve & Publish"
        icon={<Check className="mr-1.5 h-3.5 w-3.5" />}
        busy={busy === "Approve"}
        variant="primary"
        onClick={() => call("Published", "Approve")}
      />,
      <ActionBtn
        key="sendback"
        label="Send back for edits"
        icon={<Undo2 className="mr-1.5 h-3.5 w-3.5" />}
        busy={busy === "SendBack"}
        onClick={() => call("Candidate", "SendBack")}
      />,
      <ActionBtn
        key="reject"
        label="Reject"
        icon={<X className="mr-1.5 h-3.5 w-3.5" />}
        variant="destructive"
        onClick={() => setRejectOpen(true)}
      />,
    );
  }

  if (buttons.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">{buttons}</div>
      {error && (
        <p className="text-[11px] text-rose-700 dark:text-rose-300">{error}</p>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  icon,
  onClick,
  busy,
  variant,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  variant?: "primary" | "destructive";
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant === "primary" ? "default" : variant === "destructive" ? "outline" : "outline"}
      className={cn(
        variant === "destructive" && "border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300",
      )}
      onClick={onClick}
      disabled={busy}
    >
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );
}
