"use client";

import type { Route } from "next";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { processPeriod } from "@/app/(workspace)/payroll/payruns-actions";

/**
 * Process button for TERMINAL runs. Bypasses the /run wizard
 * entirely (which is class-based and doesn't fit a single-employee
 * §14 payout) and calls processPeriod directly. On success, the
 * run flips to PROCESSED and the standard payslip register renders.
 */
export function TerminalProcessButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          try {
            await processPeriod(runId);
            toast.success("Terminal run processed — payslip written.");
            router.push(`/payroll/${encodeURIComponent(runId)}` as Route);
            router.refresh();
          } catch (err) {
            const msg = (err as { message?: string })?.message ?? "Process failed.";
            toast.error(msg);
          }
        })
      }
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing…
        </>
      ) : (
        <>Process now →</>
      )}
    </button>
  );
}
