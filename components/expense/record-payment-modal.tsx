"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RecordPaymentState } from "@/app/(workspace)/hr/expense-claims/actions";
import type { AccountOption } from "./expense-form";

type Action = (
  prev: RecordPaymentState,
  form: FormData,
) => Promise<RecordPaymentState>;
const EMPTY: RecordPaymentState = {};

/**
 * "Record payment" affordance on an approved-but-unpaid Expense Claim.
 * Opens a small modal, lets HR pick which bank/cash account funded the
 * payment, confirm the amount, and post it. Backend creates a submitted
 * Payment Entry and the claim's status flips Unpaid → Paid.
 *
 * Only shown when the claim is docstatus=1 (approved) AND status=Unpaid.
 */
export function RecordPaymentButton({
  action,
  claimId,
  employeeName,
  sanctionedAmount,
  payableAccountLabel,
  paidFromOptions,
  modesOfPayment,
  today,
}: {
  action: Action;
  claimId: string;
  employeeName: string;
  sanctionedAmount: number;
  payableAccountLabel: string | null;
  paidFromOptions: AccountOption[];
  modesOfPayment: string[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useFormState(action, EMPTY);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-close on success + hard-refresh via the revalidatePath the
  // action already fired. Give the user a beat to see the confirmation.
  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => {
        setOpen(false);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-rise px-4 text-sm font-semibold text-white transition hover:bg-rise/90 focus-ring"
      >
        <CreditCard className="h-4 w-4" />
        Record payment
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-payment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-lg rounded-card border border-hairline bg-surface p-6 shadow-rail"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="record-payment-title" className="text-lg font-semibold text-ink-900">
                  Record payment
                </h2>
                <p className="mt-1 text-xs text-ash-600">
                  Log the reimbursement paid to {employeeName}. Marks the claim as Paid.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ash-500 transition hover:bg-canvas hover:text-ash-800 focus-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {state.success ? (
              <p className="flex items-center gap-2 rounded-xl border border-rise/30 bg-rise/[0.08] px-3 py-3 text-sm text-rise">
                <CheckCircle2 className="h-4 w-4" />
                Payment recorded. Closing…
              </p>
            ) : (
              <form action={dispatch} className="flex flex-col gap-3">
                {state.error && (
                  <p
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {state.error}
                  </p>
                )}

                <FieldLabel label="Paid from" required>
                  {paidFromOptions.length === 0 ? (
                    <input
                      type="text"
                      name="paid_from"
                      placeholder="Type the bank or cash account name"
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                      required
                    />
                  ) : (
                    <select
                      name="paid_from"
                      required
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                      defaultValue=""
                    >
                      <option value="" disabled>— pick an account —</option>
                      {paidFromOptions.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  )}
                </FieldLabel>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldLabel label="Amount" required>
                    <input
                      type="number"
                      name="amount"
                      defaultValue={sanctionedAmount}
                      step="0.01"
                      min="0"
                      required
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  </FieldLabel>
                  <FieldLabel label="Payment date" required>
                    <input
                      type="date"
                      name="posting_date"
                      defaultValue={today}
                      required
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  </FieldLabel>
                </div>

                <FieldLabel label="Mode of payment">
                  <select
                    name="mode_of_payment"
                    defaultValue=""
                    className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                  >
                    <option value="">— optional —</option>
                    {modesOfPayment.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </FieldLabel>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldLabel label="Reference number">
                    <input
                      type="text"
                      name="reference_no"
                      placeholder="Cheque no. / transfer ref"
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  </FieldLabel>
                  <FieldLabel label="Reference date">
                    <input
                      type="date"
                      name="reference_date"
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  </FieldLabel>
                </div>

                {payableAccountLabel && (
                  <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ash-600">
                    Settles the payable account <span className="font-medium text-ash-800">{payableAccountLabel}</span>.
                  </p>
                )}

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-9 rounded-chip px-3 text-sm text-ash-700 transition hover:bg-canvas focus-ring"
                  >
                    Cancel
                  </button>
                  <SubmitBtn />
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
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
        {required && <span className="ml-0.5 text-fall">*</span>}
      </span>
      {children}
    </label>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-chip bg-rise px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-rise/90 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Recording…
        </>
      ) : (
        "Record payment"
      )}
    </button>
  );
}
