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
  updatePaymentEntryAction,
  type FormState,
} from "@/app/(workspace)/accounting/payment-entries/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { LinkField } from "@/components/common/link-field";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Company = { name: string; abbr: string; currency: string };
type Mode = { name: string; type: string };

export type PaymentEntryEditInitial = {
  name: string;
  paymentType: string;
  postingDate: string;
  company: string;
  partyType: string | null;
  party: string | null;
  paidFrom: string | null;
  paidTo: string | null;
  paidAmount: number;
  receivedAmount: number;
  modeOfPayment: string | null;
  referenceNo: string | null;
  referenceDate: string | null;
  remarks: string | null;
};

export function NewPaymentEntryForm({
  companies,
  accounts,
  modes,
  partyTypes,
  paymentTypes,
  defaultCompany,
  defaultDate,
  defaultReceivable,
  defaultPayable,
  defaultBank,
  defaultCash,
  initial,
}: {
  companies: Company[];
  accounts: AccountOption[];
  modes: Mode[];
  partyTypes: string[];
  paymentTypes: string[];
  defaultCompany: string;
  defaultDate: string;
  /** Company default accounts — used to prefill the accounting side
   *  so the user only has to pick the bank/cash side. */
  defaultReceivable?: string | null;
  defaultPayable?: string | null;
  defaultBank?: string | null;
  defaultCash?: string | null;
  initial?: PaymentEntryEditInitial;
}) {
  const isEdit = Boolean(initial);
  const boundAction = isEdit
    ? updatePaymentEntryAction.bind(null, initial!.name)
    : createPaymentEntryAction;
  const [state, dispatch] = useFormState(boundAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  const bankOrCash = defaultBank || defaultCash || "";
  const prefillFor = (type: string): { from: string; to: string } => {
    if (type === "Receive") return { from: defaultReceivable ?? "", to: bankOrCash };
    if (type === "Pay") return { from: bankOrCash, to: defaultPayable ?? "" };
    return { from: "", to: "" };
  };

  const [paymentType, setPaymentType] = useState(initial?.paymentType ?? "Receive");
  const [partyType, setPartyType] = useState(initial?.partyType ?? "Customer");
  const [company, setCompany] = useState(initial?.company ?? defaultCompany ?? "");
  const [paidAmount, setPaidAmount] = useState(
    initial?.paidAmount ? String(initial.paidAmount) : "",
  );
  const [paidFrom, setPaidFrom] = useState(
    initial?.paidFrom ?? prefillFor(initial?.paymentType ?? "Receive").from,
  );
  const [paidTo, setPaidTo] = useState(
    initial?.paidTo ?? prefillFor(initial?.paymentType ?? "Receive").to,
  );

  const onPaymentTypeChange = (next: string) => {
    const prevDefaults = prefillFor(paymentType);
    const nextDefaults = prefillFor(next);
    setPaymentType(next);
    // Re-prefill a side only when the user hasn't customised it (it's
    // blank or still the previous type's default) — keeps their picks.
    if (!paidFrom || paidFrom === prevDefaults.from) setPaidFrom(nextDefaults.from);
    if (!paidTo || paidTo === prevDefaults.to) setPaidTo(nextDefaults.to);
  };

  const [modeOfPayment, setModeOfPayment] = useState(initial?.modeOfPayment ?? "");

  // A bank-type account on either side (or a Bank-type mode of payment)
  // makes Reference No. + Reference Date mandatory server-side. Detect
  // it live so the fields show as required BEFORE the user hits Save.
  const accountTypeByName = useMemo(
    () => new Map(accounts.map((a) => [a.name, a.accountType])),
    [accounts],
  );
  const modeTypeByName = useMemo(() => new Map(modes.map((m) => [m.name, m.type])), [modes]);
  const bankInvolved =
    accountTypeByName.get(paidFrom) === "Bank" ||
    accountTypeByName.get(paidTo) === "Bank" ||
    modeTypeByName.get(modeOfPayment) === "Bank";

  const isInternal = paymentType === "Internal Transfer";
  const sideCopy =
    paymentType === "Receive"
      ? {
          fromHint: "The customer's receivable account — prefilled from your Company defaults.",
          toHint: "Bank or cash account the money arrived into.",
        }
      : paymentType === "Pay"
      ? {
          fromHint: "Bank or cash account the money left from.",
          toHint: "The supplier's payable account — prefilled from your Company defaults.",
        }
      : {
          fromHint: "Bank or cash account the money left from.",
          toHint: "Bank or cash account the money moved into.",
        };

  const partyDoctype = partyType === "Supplier" ? "Supplier" : partyType === "Employee" ? "Employee" : "Customer";

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
              onChange={(e) => onPaymentTypeChange(e.target.value)}
            />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <LinkField
              id="company"
              name="company"
              doctype="Company"
              value={company}
              onChange={(next) => setCompany(next)}
              required
              invalid={Boolean(fe.company)}
            />
          </Field>
          <Field label="Posting Date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput
              id="posting_date"
              type="date"
              name="posting_date"
              defaultValue={initial?.postingDate ?? defaultDate}
            />
          </Field>
          <Field label="Mode of Payment" htmlFor="mode_of_payment" error={fe.mode_of_payment}>
            <LinkField
              id="mode_of_payment"
              name="mode_of_payment"
              doctype="Colossal Mode of Payment"
              value={modeOfPayment}
              onChange={setModeOfPayment}
              invalid={Boolean(fe.mode_of_payment)}
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
              <LinkField
                id="party"
                name="party"
                doctype={partyDoctype}
                defaultValue={initial?.party ?? ""}
                required
                invalid={Boolean(fe.party)}
                placeholder={`Search ${partyType}…`}
              />
            </Field>
          </div>
        </FormSection>
      )}

      <FormSection title="Accounts" description="Money flows from paid-from to paid-to. Bank/cash on one side, receivable/payable on the other.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid From" htmlFor="paid_from" error={fe.paid_from} hint={sideCopy.fromHint} required>
            <LinkField
              id="paid_from"
              name="paid_from"
              doctype="Colossal Account"
              value={paidFrom}
              onChange={setPaidFrom}
              required
              invalid={Boolean(fe.paid_from)}
              seed={company ? { company } : undefined}
              filters={company ? [["company", "=", company], ["is_group", "=", 0]] : [["is_group", "=", 0]]}
            />
          </Field>
          <Field label="Paid To" htmlFor="paid_to" error={fe.paid_to} hint={sideCopy.toHint} required>
            <LinkField
              id="paid_to"
              name="paid_to"
              doctype="Colossal Account"
              value={paidTo}
              onChange={setPaidTo}
              required
              invalid={Boolean(fe.paid_to)}
              seed={company ? { company } : undefined}
              filters={company ? [["company", "=", company], ["is_group", "=", 0]] : [["is_group", "=", 0]]}
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
              defaultValue={initial?.receivedAmount ? String(initial.receivedAmount) : ""}
              placeholder="Defaults to Paid Amount"
              className="tabular-nums"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Reference"
        description={
          bankInvolved
            ? "A bank account is involved, so the bank reference is required — the cheque / EFT / transfer number and its date."
            : "Cheque number, bank ref, or invoice reference — anything to trace this payment."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Reference No."
            htmlFor="reference_no"
            error={fe.reference_no}
            required={bankInvolved}
            hint={bankInvolved ? "Required for bank payments." : undefined}
          >
            <TextInput
              id="reference_no"
              name="reference_no"
              defaultValue={initial?.referenceNo ?? ""}
              placeholder={bankInvolved ? "Cheque / EFT / transfer reference" : "Optional"}
              required={bankInvolved}
            />
          </Field>
          <Field
            label="Reference Date"
            htmlFor="reference_date"
            error={fe.reference_date}
            required={bankInvolved}
            hint={bankInvolved ? "Required for bank payments." : undefined}
          >
            <TextInput
              id="reference_date"
              name="reference_date"
              type="date"
              defaultValue={initial?.referenceDate ?? ""}
              required={bankInvolved}
            />
          </Field>
          <Field label="Remarks" htmlFor="remarks" error={fe.remarks} wide>
            <TextArea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={initial?.remarks ?? ""}
              placeholder="What this payment is for."
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={
            (isEdit
              ? `/accounting/payment-entries/${encodeURIComponent(initial!.name)}`
              : "/accounting/payment-entries") as Route
          }
          className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
        >
          Cancel
        </Link>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  const label = isEdit
    ? pending ? "Saving changes…" : "Save changes"
    : pending ? "Saving…" : "Save draft";
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
      {label}
    </button>
  );
}
