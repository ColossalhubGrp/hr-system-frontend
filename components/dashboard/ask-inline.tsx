"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUpRight } from "lucide-react";

const SUGGESTIONS = [
  "What did overtime cost last month?",
  "Employees by department",
  "Payroll cost trend this year",
];

/**
 * A quiet way into Intelligence from the landing dashboard — the
 * owner types the question where they already are and lands in the
 * Ask chat to read the answer.
 */
export function AskInline() {
  const router = useRouter();
  const [text, setText] = useState("");

  const go = (q?: string) => {
    const question = (q ?? text).trim();
    router.push(
      question
        ? `/analytics/ask?q=${encodeURIComponent(question)}`
        : "/analytics/ask",
    );
  };

  return (
    <div className="card flex flex-col gap-3 px-5 py-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex items-center gap-3"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-mint-800" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask your business a question — employees, payroll cost, attrition…"
          className="h-9 w-full bg-transparent text-sm text-ash-900 placeholder:text-ash-400 focus:outline-none"
          aria-label="Ask Intelligence a question"
        />
        <button
          type="submit"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring"
        >
          Ask
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-full border border-hairline px-2.5 py-0.5 text-[11px] text-ash-500 transition hover:border-ink-300 hover:text-ash-900"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
