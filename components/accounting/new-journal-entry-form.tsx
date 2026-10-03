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
  /** Rate from account currency → company currency. Only used when
   *  multi-currency is on; otherwise it's implicitly 1.0 per line. */
  exchange_rate: string;
};

const EMPTY_LINE = (): Line => ({
  account: "",
  debit: "",
  credit: "",
  cost_center: "",
  user_remark: "",
  exchange_rate: "1",
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
  const [multiCurrency, setMultiCurrency] = useState(false);

  const companyCurrency =
    companies.find((c) => c.name === company)?.currency ?? "USD";

  // Multi-currency mode balances in COMPANY currency: each line's
  // debit/credit is in the account's currency, multiplied by the user's
  // exchange rate before being summed. Single-currency mode just sums
  // the raw inputs (rate is 1.0 everywhere).
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      const rate = multiCurrency ? Number(l.exchange_rate) || 0 : 1;
      debit += (Number(l.debit) || 0) * rate;
      credit += (Number(l.credit) || 0) * rate;
    }
    return { debit, credit, diff: Math.round((debit - credit) * 100) / 100 };
  }, [lines, multiCurrency]);

  const balanced = Math.abs(totals.diff) < 0.005;
  const ratesValid =
    !multiCurrency ||
    lines.every((l) => !l.exchange_rate || Number(l.exchange_rate) > 0);
  const canSubmit =
    balanced && totals.debit > 0 && lines.every((l) => l.account) && ratesValid;

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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={multiCurrency}
                onChange={(e) => setMultiCurrency(e.target.checked)}
              />
              Multi-currency
            </label>
            <p className="text-xs text-muted-foreground">
              {multiCurrency
                ? `Each line keeps its own currency; totals balance in ${companyCurrency}.`
                : `All lines post in ${companyCurrency}.`}
            </p>
          </div>
          <input type="hidden" name="multi_currency" value={multiCurrency ? "1" : "0"} />

          {lines.map((line, idx) => (
            <LineRow
              key={idx}
              idx={idx}
              line={line}
              accounts={accounts}
              canRemove={lines.length > 2}
              multiCurrency={multiCurrency}
              companyCurrency={companyCurrency}
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
            <TotalsBar
              debit={totals.debit}
              credit={totals.credit}
              balanced={balanced}
              currency={companyCurrency}
            />
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
              exchange_rate: multiCurrency
                ? Number(l.exchange_rate) || 1
                : 1,
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
  multiCurrency,
  companyCurrency,
  onChange,
  onRemove,
}: {
  idx: number;
  line: Line;
  accounts: AccountOption[];
  canRemove: boolean;
  multiCurrency: boolean;
  companyCurrency: string;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const picked = accounts.find((a) => a.name === line.account);
  const accountCurrency = picked?.currency || companyCurrency;
  const foreign = multiCurrency && accountCurrency !== companyCurrency;
  const rate = Number(line.exchange_rate) || 1;
  const debitInCompany =
    foreign && line.debit ? (Number(line.debit) || 0) * rate : 0;
  const creditInCompany =
    foreign && line.credit ? (Number(line.credit) || 0) * rate : 0;

  return (
    <div className="grid grid-cols-12 items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
      <div className="col-span-12 md:col-span-4">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Account #{idx + 1}
          {multiCurrency && picked && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/80">
              ({accountCurrency})
            </span>
          )}
        </label>
        <SelectInput
          value={line.account}
          placeholder="Select an account…"
          options={accounts.map((a) => ({ value: a.name, label: a.name }))}
          onChange={(e) => onChange({ account: e.target.value })}
        />
      </div>
      <div className={multiCurrency ? "col-span-6 md:col-span-2" : "col-span-6 md:col-span-2"}>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Debit {multiCurrency && <span className="font-mono text-[10px]">({accountCurrency})</span>}
        </label>
        <TextInput
          type="number"
          step="0.01"
          min="0"
          value={line.debit}
          onChange={(e) =>
            onChange({
              debit: e.target.value,
              credit: e.target.value ? "" : line.credit,
            })
          }
          placeholder="0.00"
          className="tabular-nums"
        />
      </div>
      <div className="col-span-6 md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Credit {multiCurrency && <span className="font-mono text-[10px]">({accountCurrency})</span>}
        </label>
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
      {multiCurrency && (
        <div className="col-span-6 md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Rate → {companyCurrency}
          </label>
          <TextInput
            type="number"
            step="0.000001"
            min="0"
            value={line.exchange_rate}
            onChange={(e) => onChange({ exchange_rate: e.target.value })}
            placeholder="1.0"
            disabled={!foreign}
            className="tabular-nums"
          />
          {foreign && (debitInCompany > 0 || creditInCompany > 0) && (
            <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
              = {(debitInCompany || creditInCompany).toFixed(2)} {companyCurrency}
            </p>
          )}
        </div>
      )}
      <div className={cn(multiCurrency ? "col-span-5 md:col-span-1" : "col-span-11 md:col-span-3")}>
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
  currency,
}: {
  debit: number;
  credit: number;
  balanced: boolean;
  currency: string;
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-muted-foreground">
        Debit{" "}
        <strong className="tabular-nums text-foreground">
          {debit.toFixed(2)} {currency}
        </strong>
      </span>
      <span className="text-muted-foreground">
        Credit{" "}
        <strong className="tabular-nums text-foreground">
          {credit.toFixed(2)} {currency}
        </strong>
      </span>
      <span
        className={cn(
          "rounded-chip px-2 py-0.5 text-xs font-semibold",
          balanced
            ? "bg-rise/10 text-rise"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {balanced ? "Balanced" : `Off by ${Math.abs(debit - credit).toFixed(2)} ${currency}`}
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
