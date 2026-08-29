"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Lock, Save, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DecisionState } from "@/app/(workspace)/hr/expense-claims/actions";
import type { AccountOption } from "./expense-form";

type Action = (
  prev: DecisionState,
  form: FormData,
) => Promise<DecisionState>;
const EMPTY: DecisionState = {};

/** Optional lock context — see components/leaves/decision-bar for
 *  the shared rationale. Frappe HR gates Expense Claim decisions
 *  to the assigned approver, so we surface that upfront rather
 *  than letting the filer hit a cryptic doctype-access error. */
export type LockContext = {
  canDecide: boolean;
  lockedToLabel?: string | null;
};

export type AccountingDefaults = {
  payableAccount: string | null;
  costCenter: string | null;
  isPaid: boolean;
  modeOfPayment: string | null;
  remark: string | null;
};

/**
 * HR decision UI for an Expense Claim. Now carries the accounting fields
 * (payable_account / cost_center / is_paid / mode_of_payment / remark)
 * inline so HR can complete a missing payable_account and approve in one
 * pass — Frappe rejects submission when payable_account is empty, and
 * the field only auto-fills when the company default is set.
 *
 * Three separate forms because approve and reject bind to different
 * server actions; each form mirrors the accounting values into hidden
 * inputs so whichever button HR clicks gets the current values.
 */
export function ExpenseDecisionBar({
  approve,
  reject,
  saveAccounting,
  lock,
  payableAccounts,
  costCenters,
  modesOfPayment,
  defaults,
}: {
  approve: Action;
  reject: Action;
  saveAccounting: Action;
  lock?: LockContext;
  payableAccounts: AccountOption[];
  costCenters: AccountOption[];
  modesOfPayment: string[];
  defaults: AccountingDefaults;
}) {
  const [approveState, approveDispatch] = useFormState(approve, EMPTY);
  const [rejectState, rejectDispatch] = useFormState(reject, EMPTY);
  const [saveState, saveDispatch] = useFormState(saveAccounting, EMPTY);
  const rawError = approveState.error ?? rejectState.error ?? saveState.error;
  const error = rawError
    ? translatePermissionError(rawError, lock?.lockedToLabel ?? null)
    : null;
  const locked = lock ? !lock.canDecide : false;

  const [payableAccount, setPayableAccount] = useState(defaults.payableAccount ?? "");
  const [costCenter, setCostCenter] = useState(defaults.costCenter ?? "");
  const [isPaid, setIsPaid] = useState(defaults.isPaid);
  const [modeOfPayment, setModeOfPayment] = useState(defaults.modeOfPayment ?? "");
  const [remark, setRemark] = useState(defaults.remark ?? "");

  const missingPayable = !payableAccount;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4 shadow-card">
      <div>
        <p className="text-sm font-medium text-ash-900">Decide on this claim</p>
        <p className="text-xs text-ash-500">
          Approving submits the doc and posts the sanctioned amount. Fill in
          any missing accounting fields below first — Frappe requires them
          before submission.
        </p>
      </div>

      {locked && lock?.lockedToLabel && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs font-medium text-amber-900"
        >
          <Lock className="h-3.5 w-3.5 text-amber-700" />
          Only {lock.lockedToLabel} can approve or reject this.
        </p>
      )}

      {missingPayable && !locked && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Payable account is empty — pick one below (or set the company
          default in Frappe Desk to auto-fill on future claims).
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* Visible controls — controlled by parent state, mirrored into
          each form's hidden inputs so all three buttons see the same
          values. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldLabel label="Payable account" required={missingPayable}>
          {payableAccounts.length === 0 ? (
            <input
              type="text"
              value={payableAccount}
              onChange={(e) => setPayableAccount(e.target.value)}
              placeholder="Type the account name"
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
          ) : (
            <select
              value={payableAccount}
              onChange={(e) => setPayableAccount(e.target.value)}
              className={cn(
                "rounded-md border bg-white px-2 py-1.5 text-sm focus-ring",
                missingPayable ? "border-amber-400" : "border-hairline",
              )}
            >
              <option value="">— pick one —</option>
              {payableAccounts.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          )}
        </FieldLabel>

        <FieldLabel label="Cost center">
          {costCenters.length === 0 ? (
            <input
              type="text"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              placeholder="Type the cost center name"
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
          ) : (
            <select
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            >
              <option value="">— inherit from company default —</option>
              {costCenters.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}
        </FieldLabel>

        <FieldLabel label="Paid on filing?">
          <label className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-white px-2 text-sm text-ash-700 focus-within:ring-2 focus-within:ring-ink-400/40">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            <span className="text-xs">Employee already reimbursed</span>
          </label>
        </FieldLabel>

        {isPaid && (
          <FieldLabel label="Mode of payment">
            <select
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            >
              <option value="">— pick one —</option>
              {modesOfPayment.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FieldLabel>
        )}

        <div className="md:col-span-2">
          <FieldLabel label="Remarks">
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="Optional — visible on the claim"
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
          </FieldLabel>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
        <form action={saveDispatch} className="flex">
          <MirroredHiddens
            payableAccount={payableAccount}
            costCenter={costCenter}
            isPaid={isPaid}
            modeOfPayment={modeOfPayment}
            remark={remark}
          />
          <Btn tone="save" pendingLabel="Saving…" disabled={locked}>
            <Save className="h-4 w-4" />
            Save accounting
          </Btn>
        </form>

        <div className="flex items-center gap-2">
          <form action={rejectDispatch}>
            <MirroredHiddens
              payableAccount={payableAccount}
              costCenter={costCenter}
              isPaid={isPaid}
              modeOfPayment={modeOfPayment}
              remark={remark}
            />
            <Btn tone="reject" pendingLabel="Rejecting…" disabled={locked}>
              <X className="h-4 w-4" />
              Reject
            </Btn>
          </form>
          <form action={approveDispatch}>
            <MirroredHiddens
              payableAccount={payableAccount}
              costCenter={costCenter}
              isPaid={isPaid}
              modeOfPayment={modeOfPayment}
              remark={remark}
            />
            <Btn
              tone="approve"
              pendingLabel="Approving…"
              disabled={locked || missingPayable}
              title={missingPayable ? "Pick a payable account first" : undefined}
            >
              <Check className="h-4 w-4" />
              Approve
            </Btn>
          </form>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-ash-600">
        {label}
        {required && <span className="ml-0.5 text-amber-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function MirroredHiddens({
  payableAccount,
  costCenter,
  isPaid,
  modeOfPayment,
  remark,
}: {
  payableAccount: string;
  costCenter: string;
  isPaid: boolean;
  modeOfPayment: string;
  remark: string;
}) {
  return (
    <>
      <input type="hidden" name="payable_account" value={payableAccount} />
      <input type="hidden" name="cost_center" value={costCenter} />
      <input type="hidden" name="is_paid" value={isPaid ? "1" : "0"} />
      <input type="hidden" name="mode_of_payment" value={modeOfPayment} />
      <input type="hidden" name="remark" value={remark} />
    </>
  );
}

function translatePermissionError(
  raw: string,
  lockedToLabel: string | null,
): string {
  const isPerm = /does not have doctype access via role permission/i.test(raw);
  if (!isPerm) return raw;
  if (lockedToLabel) {
    return `Only ${lockedToLabel} can approve or reject this.`;
  }
  return "Only the assigned approver can act on this claim.";
}

function Btn({
  tone,
  pendingLabel,
  disabled,
  title,
  children,
}: {
  tone: "approve" | "reject" | "save";
  pendingLabel: string;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={title}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold transition focus-ring",
        tone === "approve" && "bg-rise text-white hover:bg-rise/90",
        tone === "reject" &&
          "bg-surface text-fall border border-fall/40 hover:bg-fall/[0.06]",
        tone === "save" &&
          "bg-surface text-ash-700 border border-hairline hover:bg-canvas",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
