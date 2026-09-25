"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import { createJournalEntryAction, type FormState } from "@/app/(workspace)/accounting/journal-entries/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Company = { name: string; abbr: string; currency: string };

type Line = {
  account: string;
  debit: string;
  credit: string;
  cost_center: string;
  user_remark: string;
};

const EMPTY_LINE = (): Line => ({
  account: "",
  debit: "",
  credit: "",
  cost_center: "",
  user_remark: "",
});

export function NewJournalEntryForm({
  companies,
  initialAccounts,
  voucherTypes,
  defaultCompany,
  defaultDate,
}: {
  companies: Company[];
  initialAccounts: AccountOption[];
  voucherTypes: string[];
  defaultCompany: string;
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createJournalEntryAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [company, setCompany] = useState(defaultCompany);
  const [accounts, setAccounts] = useState<AccountOption[]>(initialAccounts);
  const [lines, setLines] = useState<Line[]>([EMPTY_LINE(), EMPTY_LINE()]);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
    return { debit, credit, diff: Math.round((debit - credit) * 100) / 100 };
  }, [lines]);

  const balanced = Math.abs(totals.diff) < 0.005;
  const canSubmit = balanced && totals.debit > 0 && lines.every((l) => l.account);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Voucher" description="Company, date and voucher type all post-forward to the ledger.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput
              id="company"
              name="company"
              value={company}
              placeholder="Select a company…"
              options={companies.map((c) => ({ value: c.name, label: c.name }))}
              onChange={(e) => {
                setCompany(e.target.value);
                // Blow away accounts when the company changes — the picker
                // will refetch on next open. Simple and correct; a warm
                // cache per company is a later optimisation.
                setAccounts([]);
              }}
            />
          </Field>
          <Field label="Voucher Type" htmlFor="voucher_type" error={fe.voucher_type} required>
            <SelectInput
              id="voucher_type"
              name="voucher_type"
              defaultValue="Journal Entry"
              options={voucherTypes}
            />
          </Field>
          <Field label="Posting Date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput id="posting_date" type="date" name="posting_date" defaultValue={defaultDate} />
          </Field>
          <Field label="Cheque / Reference No." htmlFor="cheque_no" error={fe.cheque_no}>
            <TextInput id="cheque_no" name="cheque_no" placeholder="Optional" />
          </Field>
          <Field label="Cheque / Reference Date" htmlFor="cheque_date" error={fe.cheque_date}>
            <TextInput id="cheque_date" type="date" name="cheque_date" />
          </Field>
          <Field label="Remark" htmlFor="user_remark" error={fe.user_remark} wide>
            <TextArea id="user_remark" name="user_remark" rows={2} placeholder="What this entry is for." />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Lines"
        description="Add one or more debits and credits. Totals must balance to save."
      >
        <div className="flex flex-col gap-3">
          {lines.map((line, idx) => (
            <LineRow
              key={idx}
              idx={idx}
              line={line}
              accounts={accounts}
              canRemove={lines.length > 2}
              onChange={(patch) =>
                setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
              }
              onRemove={() =>
                setLines((prev) => prev.filter((_, i) => i !== idx))
              }
            />
          ))}
          {fe.accounts_json && (
            <p className="text-xs text-destructive">{fe.accounts_json}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
              className="inline-flex items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </button>
            <TotalsBar debit={totals.debit} credit={totals.credit} balanced={balanced} />
          </div>
        </div>

        {/* Hidden JSON payload — the server action parses this. */}
        <input
          type="hidden"
          name="accounts_json"
          value={JSON.stringify(
            lines.map((l) => ({
              account: l.account,
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              cost_center: l.cost_center || undefined,
              user_remark: l.user_remark || undefined,
            })),
          )}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={"/accounting/journal-entries" as Route}
          className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
        >
          Cancel
        </Link>
        <SubmitButton disabled={!canSubmit} />
      </div>
    </form>
  );
}

function LineRow({
  idx,
  line,
  accounts,
  canRemove,
  onChange,
  onRemove,
}: {
  idx: number;
  line: Line;
  accounts: AccountOption[];
  canRemove: boolean;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
      <div className="col-span-12 md:col-span-5">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Account #{idx + 1}
        </label>
        <SelectInput
          value={line.account}
          placeholder="Select an account…"
          options={accounts.map((a) => ({ value: a.name, label: a.name }))}
          onChange={(e) => onChange({ account: e.target.value })}
        />
      </div>
      <div className="col-span-6 md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Debit</label>
        <TextInput
          type="number"
          step="0.01"
          min="0"
          value={line.debit}
          onChange={(e) =>
            onChange({
              debit: e.target.value,
              // Enforce debit XOR credit at the input level
              credit: e.target.value ? "" : line.credit,
            })
          }
          placeholder="0.00"
          className="tabular-nums"
        />
      </div>
      <div className="col-span-6 md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Credit</label>
        <TextInput
          type="number"
          step="0.01"
          min="0"
          value={line.credit}
          onChange={(e) =>
            onChange({
              credit: e.target.value,
              debit: e.target.value ? "" : line.debit,
            })
          }
          placeholder="0.00"
          className="tabular-nums"
        />
      </div>
      <div className="col-span-11 md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cost Center</label>
        <TextInput
          value={line.cost_center}
          onChange={(e) => onChange({ cost_center: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="col-span-1 flex items-end justify-end">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-6 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove line ${idx + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function TotalsBar({
  debit,
  credit,
  balanced,
}: {
  debit: number;
  credit: number;
  balanced: boolean;
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-muted-foreground">
        Debit <strong className="tabular-nums text-foreground">{debit.toFixed(2)}</strong>
      </span>
      <span className="text-muted-foreground">
        Credit <strong className="tabular-nums text-foreground">{credit.toFixed(2)}</strong>
      </span>
      <span
        className={cn(
          "rounded-chip px-2 py-0.5 text-xs font-semibold",
          balanced
            ? "bg-rise/10 text-rise"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {balanced ? "Balanced" : `Off by ${Math.abs(debit - credit).toFixed(2)}`}
      </span>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
        disabled || pending
          ? "bg-muted-foreground cursor-not-allowed"
          : "bg-ink-800 hover:bg-ink-700",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save draft"}
    </button>
  );
}
