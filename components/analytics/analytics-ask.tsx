"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  BarChart3,
  Bot,
  ChevronRight,
  Loader2,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { VizRenderer } from "./viz-renderer";
import { FollowupChips } from "./followup-chips";
import type { AnalyzeResponse, Turn } from "./types";

/**
 * Full-page conversational analytics — SRS US-46 realized on the
 * user's Lightdash + Zenlytic-shaped architecture.
 *
 * One turn = user question → server pipeline → assistant response
 * with narrative + chart + follow-up chips. Turns stack top-to-bottom;
 * new answer scrolls the composer stays fixed at the bottom.
 *
 * Client-only state (sessionStorage) matches the chatbot drawer's
 * pattern. Every follow-up chip click re-runs the pipeline server-
 * side, so click behaviour is identical to typing.
 */

const STORAGE_KEY = "colossal-analytics-turns";
const SUGGESTIONS = [
  "How many active employees do we have?",
  "Headcount by department",
  "Gender split of active headcount",
  "How many new hires this year?",
  "Attrition rate over the last 12 months",
];

export function AnalyticsAsk() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setTurns(JSON.parse(raw) as Turn[]);
    } catch {
      /* sessionStorage disabled — start fresh */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns));
    } catch {
      /* best effort */
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  const ask = useCallback(async (rawQuestion: string) => {
    const q = rawQuestion.trim();
    if (!q || pending) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setPending(true);
    try {
      const res = await fetch("/api/analytics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        // Route-handler error path — best-effort extract .error, else HTTP status.
        let err = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: unknown };
          if (body && typeof body.error === "string") err = body.error;
        } catch { /* non-JSON body */ }
        setTurns((t) => [...t, refusedAssistantTurn(q, err)]);
        return;
      }
      const data = (await res.json()) as AnalyzeResponse;
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          question: q,
          refused: data.refused,
          refusal_reason: data.refusal_reason,
          narrative: data.narrative,
          data: data.data,
          viz: data.viz,
          followups: data.followups,
          plan: data.plan,
          audit_log_id: data.audit_log_id,
          total_latency_ms: data.total_latency_ms,
          stage_latencies: data.stage_latencies,
        },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        refusedAssistantTurn(q, "Couldn't reach the analytics service. Try again."),
      ]);
    } finally {
      setPending(false);
    }
  }, [pending]);

  const clearConversation = () => {
    setTurns([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      <Header onClear={clearConversation} hasTurns={turns.length > 0} />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {turns.length === 0 && <EmptyState onPick={setInput} suggestions={SUGGESTIONS} />}
          {turns.map((t, i) =>
            t.role === "user" ? (
              <UserTurn key={i} text={t.text} />
            ) : (
              <AssistantTurn key={i} turn={t} onAsk={ask} />
            ),
          )}
          {pending && <PendingTurn />}
          <div ref={bottomRef} />
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => ask(input)}
        pending={pending}
      />
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────

function Header({ onClear, hasTurns }: { onClear: () => void; hasTurns: boolean }) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Analytics assistant
          </h1>
          <p className="text-xs text-muted-foreground">
            Ask HR analytics questions in plain English. Every answer cites its metric.
          </p>
        </div>
      </div>
      {hasTurns && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear conversation
        </Button>
      )}
    </header>
  );
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyState({
  onPick,
  suggestions,
}: {
  onPick: (q: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          What would you like to know?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask about headcount, attrition, payroll, diversity, performance —
          answers include a chart, a plain-English narrative, and follow-up
          suggestions.
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-dashed border-input bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── User bubble ────────────────────────────────────────────────────

function UserTurn({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <UserIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-1 text-sm font-medium text-foreground">
        {text}
      </div>
    </div>
  );
}

// ── Pending shimmer ────────────────────────────────────────────────

function PendingTurn() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Planning + querying + explaining (usually 4-8s)…
        </div>
        <div className="h-40 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    </div>
  );
}

// ── Assistant turn ─────────────────────────────────────────────────

function AssistantTurn({ turn, onAsk }: { turn: Extract<Turn, { role: "assistant" }>; onAsk: (q: string) => void }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-4 pt-1">
        {turn.refused ? (
          <RefusalCard reason={turn.refusal_reason} />
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-sm text-foreground">
              {turn.narrative ? (
                <ReactMarkdown>{turn.narrative}</ReactMarkdown>
              ) : (
                <p className="italic text-muted-foreground">
                  Answered — chart below.
                </p>
              )}
            </div>
            {turn.data && turn.viz && (
              <VizRenderer data={turn.data} viz={turn.viz} />
            )}
            {turn.data?.metric && (
              <MetricBadge
                name={turn.data.metric.name}
                code={turn.data.metric.code}
                latency_ms={turn.total_latency_ms}
              />
            )}
          </>
        )}
        {turn.followups.length > 0 && (
          <FollowupChips items={turn.followups} onPick={onAsk} />
        )}
      </div>
    </div>
  );
}

function RefusalCard({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-xl border border-dashed border-input bg-muted/30 px-4 py-3">
      <p className="text-sm text-foreground">
        {reason ?? "I can't answer that from the analytics catalog."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Try asking about a specific metric — headcount, attrition, payroll cost, diversity, performance.
      </p>
    </div>
  );
}

function MetricBadge({
  name,
  code,
  latency_ms,
}: {
  name: string;
  code: string;
  latency_ms: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="rounded-full bg-muted/60 px-2 py-0.5 font-medium text-foreground">
        {name}
      </span>
      <span className="font-mono">{code}</span>
      <span aria-hidden>·</span>
      <span>{latency_ms} ms</span>
    </div>
  );
}

// ── Composer ───────────────────────────────────────────────────────

function refusedAssistantTurn(question: string, reason: string): Turn {
  return {
    role: "assistant",
    question,
    refused: true,
    refusal_reason: reason,
    narrative: null,
    data: null,
    viz: null,
    followups: [],
    plan: null,
    audit_log_id: "",
    total_latency_ms: 0,
    stage_latencies: {},
  };
}

function Composer({
  value,
  onChange,
  onSend,
  pending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  pending: boolean;
}) {
  return (
    <div className="border-t bg-background px-6 py-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="mx-auto flex max-w-4xl items-end gap-2"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask about headcount, attrition, payroll, diversity, performance…"
          maxLength={500}
          disabled={pending}
          className={cn(
            "min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-transparent px-4 py-2.5 text-sm shadow-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:opacity-60",
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || pending}
          aria-label="Send"
          className="h-11 w-11 shrink-0 rounded-xl"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
