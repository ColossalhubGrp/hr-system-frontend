"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Loader2,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CitationSheet } from "./citation-sheet";
import { cn } from "@/lib/cn";

type Citation = {
  label: string;
  doctype: string;
  name: string;
  title: string;
  category?: string;
};

type AskResponse = {
  answer: string;
  citations: Citation[];
  refused: boolean;
  audit_log_id: string;
  latency_ms: number;
};

type Message =
  | { role: "user"; text: string }
  | {
      role: "bot";
      text: string;
      citations: Citation[];
      refused: boolean;
      auditLogId: string;
      rating?: "Up" | "Down";
    };

const STORAGE_KEY = "colossal-chatbot-messages";

/**
 * Right-side chat drawer for the employee HR-policy assistant (SRS US-45).
 *
 * State is intentionally client-only:
 *   - Messages persist to sessionStorage so a page navigation doesn't
 *     lose the conversation, but a browser refresh does (fresh session).
 *   - Server-side we log every ask() to AI Audit Log; no need to
 *     persist per-user conversations for phase 1.
 *
 * Citation chips open a nested sheet showing the source policy body so
 * the user can verify the answer without leaving the drawer.
 */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Restore history on mount so the conversation survives page navigation.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
    } catch {
      // sessionStorage disabled — no-op, user starts fresh
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // best-effort
    }
    // Scroll to the newest message.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setPending(true);
    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = (await res.json()) as AskResponse | { error: string };
      if (!res.ok || "error" in data) {
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            text: `Something went wrong: ${
              "error" in data ? data.error : `HTTP ${res.status}`
            }`,
            citations: [],
            refused: true,
            auditLogId: "",
          },
        ]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: cleanAnswer(data.answer),
          citations: data.citations,
          refused: data.refused,
          auditLogId: data.audit_log_id,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `Couldn't reach the assistant. Try again.`,
          citations: [],
          refused: true,
          auditLogId: "",
        },
      ]);
    } finally {
      setPending(false);
    }
  }, [input, pending]);

  const rate = useCallback(
    async (idx: number, rating: "Up" | "Down") => {
      const msg = messages[idx];
      if (!msg || msg.role !== "bot" || !msg.auditLogId) return;
      setMessages((m) =>
        m.map((x, i) => (i === idx && x.role === "bot" ? { ...x, rating } : x)),
      );
      try {
        await fetch("/api/chat/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audit_log_id: msg.auditLogId, rating }),
        });
      } catch {
        // Fire-and-forget — the UI rating already updated optimistically.
      }
    },
    [messages],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open HR assistant"
            className="relative h-10 w-10 rounded-full bg-card shadow-card"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent className="p-0">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <SheetTitle>Colossal HR assistant</SheetTitle>
                <SheetDescription>
                  Ask about leave, payroll, policies. Answers cite the source.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.length === 0 && <EmptyState onPick={setInput} />}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserBubble key={i} text={m.text} />
              ) : (
                <BotBubble
                  key={i}
                  msg={m}
                  onCite={setActiveCitation}
                  onRate={(rating) => rate(i, rating)}
                />
              ),
            )}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          <div className="border-t px-5 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask about leave, payroll, or a policy…"
                maxLength={500}
                className="min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || pending}
                aria-label="Send"
                className="h-10 w-10 shrink-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Answers are grounded in your company's HR policies and FAQs.
              Always verify the cited source before acting.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {activeCitation && (
        <CitationSheet
          citation={activeCitation}
          open={!!activeCitation}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = [
    "How many days of annual leave do I get?",
    "What is my payslip password?",
    "How long is my probation period?",
    "How long is maternity leave in Zimbabwe?",
  ];
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <Bot className="mt-0.5 h-4 w-4 text-primary" />
        <p>
          Hi. Ask me anything about your company's HR policies. I'll cite the
          source policy or FAQ so you can verify.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-dashed border-input px-3 py-2 text-left text-xs text-foreground hover:bg-muted/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

function BotBubble({
  msg,
  onCite,
  onRate,
}: {
  msg: Extract<Message, { role: "bot" }>;
  onCite: (c: Citation) => void;
  onRate: (rating: "Up" | "Down") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5 text-sm text-foreground">
        {msg.text}
      </div>
      {msg.citations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </span>
          {msg.citations.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onCite(c)}
              className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted/40"
              title={c.title}
            >
              <BookOpen className="h-3 w-3" />
              {c.title}
            </button>
          ))}
        </div>
      )}
      {msg.auditLogId && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Helpful"
            onClick={() => onRate("Up")}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted/60",
              msg.rating === "Up" && "bg-emerald-500/15 text-emerald-700",
            )}
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            onClick={() => onRate("Down")}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted/60",
              msg.rating === "Down" && "bg-rose-500/15 text-rose-700",
            )}
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
          {msg.rating === "Down" && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              Thanks — HR has been notified.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function cleanAnswer(text: string): string {
  // Strip the internal REFUSE: prefix — the UI signals refusal via
  // absent citations and a friendlier tone.
  return text.replace(/^REFUSE:\s*/i, "");
}
