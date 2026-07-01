"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/sonner";
import { createPeriod } from "@/app/(workspace)/payroll/payruns-actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Centered modal — picks (month, year) and POSTs to createPeriod.
 * The action redirects to /payroll/[id] (or [id]?exists=1 on duplicate).
 */
export function NewPeriodModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1);
  const defaultYear = String(now.getFullYear());

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createPeriod(fd);
        // redirect runs server-side; if we reach here it was the duplicate path.
        setOpen(false);
      } catch (err) {
        // Next.js redirect throws a special NEXT_REDIRECT — let it bubble.
        const msg = (err as { message?: string })?.message ?? "";
        if (msg.includes("NEXT_REDIRECT")) {
          throw err;
        }
        toast.error(msg || "Couldn't open the period.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        + New pay period
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => {
        if (!pending && e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">New pay period</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Month</span>
            <select
              name="month"
              defaultValue={defaultMonth}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-foreground">Year</span>
            <input
              name="year"
              type="number"
              defaultValue={defaultYear}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create period"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
