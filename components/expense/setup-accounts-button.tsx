"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { setupExpenseAccountsAction } from "@/app/(workspace)/hr/expense-claims/actions";

/** Small helper button rendered next to the empty-state hint on the
 *  Payable account field. Triggers the ERPNext setup primitives that
 *  create the default Chart of Accounts + Cost Center for the company
 *  the user picked — same thing Company setup wizard runs on install. */
export function SetupExpenseAccountsButton({
  company,
}: {
  company: string;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const onClick = () =>
    start(async () => {
      setStatus(null);
      const r = await setupExpenseAccountsAction(company);
      if (!r.ok) {
        setStatus(`Failed: ${r.error}`);
        return;
      }
      setStatus(
        `Added ${r.accountsAdded} account${r.accountsAdded === 1 ? "" : "s"}` +
          ` · ${r.costCentersAdded} cost center${
            r.costCentersAdded === 1 ? "" : "s"
          }.`,
      );
      router.refresh();
    });

  return (
    <div className="mt-1 flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !company}
        className="inline-flex w-fit items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ash-800 transition hover:border-ink-400 hover:text-ink-800 focus-ring disabled:opacity-60"
      >
        <Sparkles className="h-3 w-3" />
        {pending ? "Setting up…" : "Auto-set up expense accounts"}
      </button>
      {status && <span className="text-[11px] text-ash-600">{status}</span>}
    </div>
  );
}
