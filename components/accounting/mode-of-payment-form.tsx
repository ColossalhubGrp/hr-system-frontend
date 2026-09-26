"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createModeOfPaymentAction,
  updateModeOfPaymentAction,
  deleteModeOfPaymentAction,
  type FormState,
} from "@/app/(workspace)/accounting/masters/modes-of-payment/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Company = { name: string; abbr: string; currency: string };

type AccountRow = { company: string; default_account: string };

export function ModeOfPaymentForm({
  mode,
  companies,
  accounts,
  initial,
  name,
}: {
  mode: "create" | "edit";
  companies: Company[];
  accounts: AccountOption[];
  initial?: {
    modeOfPayment: string;
    type: string;
    enabled: boolean;
    accounts: AccountRow[];
  };
  name?: string;
}) {
  const action =
    mode === "create"
      ? createModeOfPaymentAction
      : updateModeOfPaymentAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [rows, setRows] = useState<AccountRow[]>(initial?.accounts ?? []);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Mode" description="The label users see when picking how a payment moved.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="mode_of_payment" error={fe.mode_of_payment} required>
            <TextInput
              id="mode_of_payment"
              name="mode_of_payment"
              defaultValue={initial?.modeOfPayment ?? ""}
              placeholder="e.g. Cash, Bank Transfer, EcoCash"
            />
          </Field>
          <Field label="Type" htmlFor="type" error={fe.type} required>
            <SelectInput
              id="type"
              name="type"
              defaultValue={initial?.type ?? "Cash"}
              options={["Cash", "Bank", "General", "Phone"]}
            />
          </Field>
          <Field label="Enabled" htmlFor="enabled">
            <label className="flex items-center gap-2 text-sm">
              <input
                id="enabled"
                type="checkbox"
                name="enabled"
                defaultChecked={initial?.enabled ?? true}
                className="h-4 w-4"
              />
              <span className="text-muted-foreground">Show in Payment Entry picker.</span>
            </label>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Default accounts"
        description="Which ledger account this mode posts to per company. Leave blank to prompt at Payment Entry time."
      >
        <div className="flex flex-col gap-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No defaults yet — add one per company.</p>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-5">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Company #{idx + 1}</label>
                <SelectInput
                  value={row.company}
                  options={[
                    ...companies.map((c) => ({ value: c.name, label: c.name })),
                  ]}
                  onChange={(e) =>
                    setRows((p) => p.map((r, i) => (i === idx ? { ...r, company: e.target.value } : r)))
                  }
                />
              </div>
              <div className="col-span-11 md:col-span-6">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Default account</label>
                <SelectInput
                  value={row.default_account}
                  options={[
                    ...accounts.map((a) => ({ value: a.name, label: a.name })),
                  ]}
                  onChange={(e) =>
                    setRows((p) => p.map((r, i) => (i === idx ? { ...r, default_account: e.target.value } : r)))
                  }
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRows((p) => p.filter((_, i) => i !== idx))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove row ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((p) => [...p, { company: "", default_account: "" }])}
            className="inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add company default
          </button>
        </div>
        <input
          type="hidden"
          name="accounts_json"
          value={JSON.stringify(rows.filter((r) => r.company && r.default_account))}
        />
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DeleteButton name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={"/accounting/masters/modes-of-payment" as Route}
            className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Cancel
          </Link>
          <SubmitButton mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
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
      {pending ? "Saving…" : mode === "create" ? "Save mode" : "Save changes"}
    </button>
  );
}

function DeleteButton({ name }: { name: string }) {
  const onSubmit = async () => {
    await deleteModeOfPaymentAction(name);
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
