"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/employee/form-bits";
import {
  createPaymentTermAction,
  updatePaymentTermAction,
  deletePaymentTermAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/payment-terms/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Initial = {
  paymentTermName: string;
  description: string | null;
  invoicePortion: number;
  creditDays: number;
  creditMonths: number;
  dueDateBasedOn: string;
  discount: number;
  discountType: string;
};

export function PaymentTermForm({
  mode,
  name,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  initial?: Initial;
}) {
  const action =
    mode === "create"
      ? createPaymentTermAction
      : updatePaymentTermAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Term" description="What to call this term and, optionally, what it means in plain language.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="payment_term_name" error={fe.payment_term_name} required>
            <TextInput
              id="payment_term_name"
              name="payment_term_name"
              defaultValue={initial?.paymentTermName ?? ""}
              placeholder="e.g. Net 30, Advance 50%, End of Month"
            />
          </Field>
          <Field label="Description" htmlFor="description" error={fe.description} wide>
            <TextArea
              id="description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              placeholder="Free text — shows on the invoice."
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Timing" description="How much of the invoice is due, and when.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Portion of invoice (%)" htmlFor="invoice_portion" error={fe.invoice_portion} required>
            <TextInput
              id="invoice_portion"
              name="invoice_portion"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={String(initial?.invoicePortion ?? 100)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Credit days" htmlFor="credit_days" error={fe.credit_days}>
            <TextInput
              id="credit_days"
              name="credit_days"
              type="number"
              min="0"
              defaultValue={String(initial?.creditDays ?? 0)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Credit months" htmlFor="credit_months" error={fe.credit_months}>
            <TextInput
              id="credit_months"
              name="credit_months"
              type="number"
              min="0"
              defaultValue={String(initial?.creditMonths ?? 0)}
              className="tabular-nums"
            />
          </Field>
          <Field label="Due date based on" htmlFor="due_date_based_on" error={fe.due_date_based_on} required wide>
            <SelectInput
              id="due_date_based_on"
              name="due_date_based_on"
              defaultValue={initial?.dueDateBasedOn ?? "Day(s) after invoice date"}
              options={[
                "Day(s) after invoice date",
                "Day(s) after the end of the invoice month",
                "Month(s) after the end of the invoice month",
              ]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Early-payment discount" description="Optional — reward customers who pay before the due date.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type" htmlFor="discount_type" error={fe.discount_type}>
            <SelectInput
              id="discount_type"
              name="discount_type"
              defaultValue={initial?.discountType ?? "Percentage"}
              options={["Percentage", "Amount"]}
            />
          </Field>
          <Field label="Discount" htmlFor="discount" error={fe.discount}>
            <TextInput
              id="discount"
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={String(initial?.discount ?? 0)}
              className="tabular-nums"
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DeleteBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={"/accounting/masters/payment-terms" as Route}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </Link>
          <SubmitBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubmitBtn({ mode }: { mode: "create" | "edit" }) {
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
      {pending ? "Saving…" : mode === "create" ? "Save term" : "Save changes"}
    </button>
  );
}

function DeleteBtn({ name }: { name: string }) {
  const onSubmit = async () => {
    await deletePaymentTermAction(name);
  };
  return (
    <form action={onSubmit}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          if (!confirm(`Delete "${name}"? This can't be undone.`)) e.preventDefault();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </form>
  );
}
