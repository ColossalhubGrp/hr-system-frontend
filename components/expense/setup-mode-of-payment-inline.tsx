"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SetupModeState } from "@/app/(workspace)/hr/expense-claims/actions";
import type { AccountOption } from "./expense-form";

type Action = (
  prev: SetupModeState,
  form: FormData,
) => Promise<SetupModeState>;
const EMPTY: SetupModeState = {};

/** Parses "Please set default Cash or Bank account in Mode of Payment X"
 *  out of a Frappe error message. Returns the mode name if the message
 *  matches, null otherwise. */
export function extractMissingModeOfPayment(msg: string): string | null {
  const m = msg.match(/Mode of Payment\s+(.+?)(?:$|\.)/i);
  return m ? m[1].trim() : null;
}

/**
 * Inline remediation the decision bar renders when Approve is blocked
 * by "Please set default Cash or Bank account in Mode of Payment X".
 * HR picks a bank/cash account and clicks Set up; the backend writes
 * the default onto the Mode of Payment for THIS company. After that
 * they can retry Approve without leaving the page.
 */
export function SetupModeOfPaymentInline({
  action,
  mode,
  company,
  cashOrBankAccounts,
}: {
  action: Action;
  mode: string;
  company: string;
  cashOrBankAccounts: AccountOption[];
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [account, setAccount] = useState<string>("");

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
      <div className="mb-2 flex items-start gap-2 text-xs text-amber-900">
        <Settings className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">
            {mode} needs a bank or cash account before payments can post.
          </p>
          <p className="mt-0.5 text-amber-800">
            Pick the account payments from {company} should flow out of.
            This is a one-time setup — new claims paid with {mode} use it
            automatically.
          </p>
        </div>
      </div>

      {state.success && (
        <p className="mb-2 flex items-center gap-2 rounded-md border border-rise/30 bg-rise/[0.06] px-2 py-1.5 text-xs text-rise">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Saved. Try Approve again.
        </p>
      )}
      {state.error && (
        <p className="mb-2 flex items-center gap-2 rounded-md border border-fall/30 bg-fall/[0.06] px-2 py-1.5 text-xs text-fall">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <form action={dispatch} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="company" value={company} />
        <div className="flex flex-1 min-w-[240px] flex-col gap-1">
          <label className="text-xs font-medium text-amber-900" htmlFor={`acct-${mode}`}>
            Bank or cash account
          </label>
          {cashOrBankAccounts.length === 0 ? (
            <input
              id={`acct-${mode}`}
              name="account"
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={`No accounts found for ${company}`}
              className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus-ring"
            />
          ) : (
            <select
              id={`acct-${mode}`}
              name="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm focus-ring"
            >
              <option value="">— pick one —</option>
              {cashOrBankAccounts.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <SetupBtn disabled={!account} />
      </form>
    </div>
  );
}

function SetupBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </>
      ) : (
        "Set up"
      )}
    </button>
  );
}
