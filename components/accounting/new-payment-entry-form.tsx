"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createPaymentEntryAction,
  type FormState,
} from "@/app/(workspace)/accounting/payment-entries/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Company = { name: string; abbr: string; currency: string };
type Mode = { name: string; type: string };

export function NewPaymentEntryForm({
  companies,
  accounts,
  modes,
  partyTypes,
  paymentTypes,
  defaultCompany,
  defaultDate,
}: {
  companies: Company[];
  accounts: AccountOption[];
  modes: Mode[];
  partyTypes: string[];
  paymentTypes: string[];
  defaultCompany: string;
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createPaymentEntryAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [paymentType, setPaymentType] = useState("Receive");
  const [partyType, setPartyType] = useState("Customer");
  const [paidAmount, setPaidAmount] = useState("");

  const isInternal = paymentType === "Internal Transfer";

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.name, label: a.name })),
    [accounts],
  );

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Payment" description="Who is being paid, on what date, in what currency and mode.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment Type" htmlFor="payment_type" error={fe.payment_type} required>
            <SelectInput
              id="payment_type"
              name="payment_type"
              value={paymentType}
              options={paymentTypes}
              onChange={(e) => setPaymentType(e.target.value)}
            />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput
              id="company"
              name="company"
              defaultValue={defaultCompany}
              options={companies.map((c) => ({ value: c.name, label: c.name }))}
            />
          </Field>
          <Field label="Posting Date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput id="posting_date" type="date" name="posting_date" defaultValue={defaultDate} />
          </Field>
          <Field label="Mode of Payment" htmlFor="mode_of_payment" error={fe.mode_of_payment}>
            <SelectInput
              id="mode_of_payment"
              name="mode_of_payment"
              defaultValue=""
              options={[
                { value: "", label: "—" },
                ...modes.map((m) => ({ value: m.name, label: `${m.name} (${m.type})` })),
              ]}
            />
          </Field>
        </div>
      </FormSection>

      {!isInternal && (
        <FormSection title="Party" description="The customer or supplier this payment is for.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Party Type" htmlFor="party_type" error={fe.party_type} required>
              <SelectInput
                id="party_type"
                name="party_type"
                value={partyType}
                options={partyTypes}
                onChange={(e) => setPartyType(e.target.value)}
              />
            </Field>
            <Field label="Party" htmlFor="party" error={fe.party} required>
              <TextInput
                id="party"
                name="party"
                placeholder={`Enter ${partyType} ID`}
              />
            </Field>
          </div>
        </FormSection>
      )}

      <FormSection title="Accounts" description="Money flows from paid-from to paid-to. Bank/cash on one side, receivable/payable on the other.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid From" htmlFor="paid_from" error={fe.paid_from}>
            <SelectInput
              id="paid_from"
              name="paid_from"
              defaultValue=""
              options={[{ value: "", label: "—" }, ...accountOptions]}
            />
          </Field>
          <Field label="Paid To" htmlFor="paid_to" error={fe.paid_to}>
            <SelectInput
              id="paid_to"
              name="paid_to"
              defaultValue=""
              options={[{ value: "", label: "—" }, ...accountOptions]}
            />
          </Field>
          <Field label="Paid Amount" htmlFor="paid_amount" error={fe.paid_amount} required>
            <TextInput
              id="paid_amount"
              name="paid_amount"
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="tabular-nums"
              placeholder="0.00"
            />
          </Field>
          <Field label="Received Amount" htmlFor="received_amount" error={fe.received_amount}>
            <TextInput
              id="received_amount"
              name="received_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Defaults to Paid Amount"
              className="tabular-nums"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Reference" description="Cheque number, bank ref, or invoice reference — anything to trace this payment.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference No." htmlFor="reference_no" error={fe.reference_no}>
            <TextInput id="reference_no" name="reference_no" placeholder="Optional" />
          </Field>
          <Field label="Reference Date" htmlFor="reference_date" error={fe.reference_date}>
            <TextInput id="reference_date" name="reference_date" type="date" />
          </Field>
          <Field label="Remarks" htmlFor="remarks" error={fe.remarks} wide>
            <TextArea id="remarks" name="remarks" rows={2} placeholder="What this payment is for." />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={"/accounting/payment-entries" as Route}
          className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
        pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save draft"}
    </button>
  );
}
