"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, ShieldCheck, Check } from "lucide-react";
import { Field, TextInput } from "@/components/employee/form-bits";
import { Button } from "@/components/ui/button";
import {
  setPayslipPinAction,
  type SetPinState,
} from "@/app/(workspace)/me/payslips/pin-actions";

const EMPTY: SetPinState = {};

function SaveButton({ isSet }: { isSet: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isSet ? "Update PIN" : "Set PIN"}
    </Button>
  );
}

/**
 * Lets the employee set or change the PIN that locks their WhatsApp
 * payslip PDFs. The PIN is never displayed — not before, not after
 * saving — only replaced. If no employee record is linked to the
 * account, the control explains that instead of failing on submit.
 */
export function PayslipPinCard({
  linked,
  isSet,
}: {
  linked: boolean;
  isSet: boolean;
}) {
  const [state, action] = useFormState(setPayslipPinAction, EMPTY);
  // Once set, keep the form tucked away behind a button so the page
  // reads as "done" rather than always presenting empty inputs.
  const [editing, setEditing] = useState(!isSet);
  const saved = state.ok === true;

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-canvas text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-ash-900">Payslip PIN</h2>
          <p className="mt-1 text-xs leading-relaxed text-ash-600">
            Your payslips are sent over WhatsApp as locked PDF files. Set a
            private PIN here and your payslips will open with it. The PIN is
            known only to you — it is never shown on WhatsApp or anywhere in
            the app.
          </p>

          {!linked ? (
            <p className="mt-4 rounded-card bg-canvas px-3 py-2 text-xs text-ash-600">
              Your account isn&rsquo;t linked to an employee record yet, so
              there are no payslips to protect. Your administrator can link it.
            </p>
          ) : saved && !editing ? (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Your payslip PIN is saved.
            </p>
          ) : !editing ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ash-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                A PIN is set.
              </span>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Change PIN
              </Button>
            </div>
          ) : (
            <form action={action} className="mt-4 flex flex-col gap-3">
              {isSet ? (
                <Field
                  label="Current PIN"
                  htmlFor="current"
                  error={undefined}
                  hint="Enter your existing PIN to change it."
                >
                  <TextInput
                    id="current"
                    name="current"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    required
                  />
                </Field>
              ) : null}

              <Field
                label={isSet ? "New PIN" : "PIN"}
                htmlFor="pin"
                required
                error={state.fieldErrors?.pin}
                hint="4 to 8 digits."
              >
                <TextInput
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  invalid={!!state.fieldErrors?.pin}
                  required
                />
              </Field>

              <Field
                label="Confirm PIN"
                htmlFor="confirm"
                required
                error={state.fieldErrors?.confirm}
              >
                <TextInput
                  id="confirm"
                  name="confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={8}
                  invalid={!!state.fieldErrors?.confirm}
                  required
                />
              </Field>

              {state.error && !state.fieldErrors ? (
                <p className="text-xs text-destructive">{state.error}</p>
              ) : null}

              <div className="flex items-center gap-2">
                <SaveButton isSet={isSet} />
                {isSet ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
