"use client";

import { ChevronRight, GitBranch, Search, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Followup } from "./types";

/**
 * Click-to-ask chips underneath each assistant answer. Clicking one
 * fires the parent's `onPick`, which sends the follow-up as a fresh
 * user turn — same server pipeline, same rendering. Keeps the "one
 * turn per exchange" mental model.
 */
export function FollowupChips({
  items,
  onPick,
}: {
  items: Followup[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        You could ask next
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(f.question)}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs",
              "text-foreground hover:bg-muted/60",
            )}
          >
            <IntentIcon intent={f.intent} />
            <span className="flex-1">{f.question}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function IntentIcon({ intent }: { intent: string }) {
  const map: Record<string, React.ReactNode> = {
    drill_down: <Search className="h-3.5 w-3.5 text-primary" />,
    compare: <GitBranch className="h-3.5 w-3.5 text-primary" />,
    trend: <TrendingUp className="h-3.5 w-3.5 text-primary" />,
    root_cause: <Zap className="h-3.5 w-3.5 text-primary" />,
    related: <ChevronRight className="h-3.5 w-3.5 text-primary" />,
  };
  return (
    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/10">
      {map[intent] ?? <ChevronRight className="h-3.5 w-3.5 text-primary" />}
    </span>
  );
}
