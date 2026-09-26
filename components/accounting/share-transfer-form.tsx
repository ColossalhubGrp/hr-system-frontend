"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextArea, TextInput } from "@/components/employee/form-bits";
import {
  createTransferAction,
  updateTransferAction,
  deleteTransferAction,
  type FormState,
} from "@/app/(workspace)/accounting/shares/transfers/actions";
import type { AccountOption } from "@/lib/frappe/accounting";
import { TRANSFER_TYPES } from "@/lib/frappe/shares/share-transfer-constants";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Initial = {
  transferType: string;
  date: string;
  fromShareholder: string | null;
  toShareholder: string | null;
  shareType: string;
  noOfShares: number;
  rate: number;
  company: string;
  fromFolioNo: string | null;
  toFolioNo: string | null;
  assetAccount: string | null;
  equityOrLiabilityAccount: string | null;
  remarks: string | null;
};

export function ShareTransferForm({
  mode,
  name,
  companies,
  shareholders,
  accounts,
  initial,
  defaultDate,
}: {
  mode: "create" | "edit";
  name?: string;
  companies: string[];
  shareholders: string[];
  accounts: AccountOption[];
  initial?: Initial;
  defaultDate: string;
}) {
  const action = mode === "create" ? createTransferAction : updateTransferAction.bind(null, name ?? "");
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [type, setType] = useState(initial?.transferType ?? "Transfer");
  const [shares, setShares] = useState<string>(String(initial?.noOfShares ?? ""));
  const [rate, setRate] = useState<string>(String(initial?.rate ?? ""));
  const amount = useMemo(() => (Number(shares) || 0) * (Number(rate) || 0), [shares, rate]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      <FormSection title="Transfer" description="Issue new shares, buy them back, or move them shareholder-to-shareholder.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Transfer type" htmlFor="transfer_type" required>
            <SelectInput id="transfer_type" name="transfer_type" value={type} options={[...TRANSFER_TYPES]} onChange={(e) => setType(e.target.value)} />
          </Field>
          <Field label="Date" htmlFor="date" error={fe.date} required>
            <TextInput id="date" name="date" type="date" defaultValue={initial?.date ?? defaultDate} />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput id="company" name="company" defaultValue={initial?.company ?? companies[0] ?? ""} options={companies} />
          </Field>
          <Field label="Share type" htmlFor="share_type" required>
            <SelectInput id="share_type" name="share_type" defaultValue={initial?.shareType ?? "Equity"} options={["Equity", "Preference"]} />
          </Field>
          <Field label="Number of shares" htmlFor="no_of_shares" error={fe.no_of_shares} required>
            <TextInput id="no_of_shares" name="no_of_shares" type="number" min="0" value={shares} onChange={(e) => setShares(e.target.value)} className="tabular-nums" />
          </Field>
          <Field label="Rate" htmlFor="rate" error={fe.rate} required>
            <TextInput id="rate" name="rate" type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className="tabular-nums" />
          </Field>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Amount <strong className="tabular-nums text-foreground">{amount.toFixed(2)}</strong>
        </div>
      </FormSection>

      <FormSection title="Parties" description="Issue leaves From blank, Purchase (buy-back) leaves To blank.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From shareholder" htmlFor="from_shareholder">
            <SelectInput id="from_shareholder" name="from_shareholder" defaultValue={initial?.fromShareholder ?? ""} options={[...shareholders.map((s) => ({ value: s, label: s }))]} disabled={type === "Issue"} />
          </Field>
          <Field label="To shareholder" htmlFor="to_shareholder">
            <SelectInput id="to_shareholder" name="to_shareholder" defaultValue={initial?.toShareholder ?? ""} options={[...shareholders.map((s) => ({ value: s, label: s }))]} disabled={type === "Purchase"} />
          </Field>
          <Field label="From folio no." htmlFor="from_folio_no">
            <TextInput id="from_folio_no" name="from_folio_no" defaultValue={initial?.fromFolioNo ?? ""} />
          </Field>
          <Field label="To folio no." htmlFor="to_folio_no">
            <TextInput id="to_folio_no" name="to_folio_no" defaultValue={initial?.toFolioNo ?? ""} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Accounts" description="Which accounts the equity movement posts to.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Asset account (cash/bank)" htmlFor="asset_account">
            <SelectInput id="asset_account" name="asset_account" defaultValue={initial?.assetAccount ?? ""} options={[...accounts.map((a) => ({ value: a.name, label: a.name }))]} />
          </Field>
          <Field label="Equity / liability account" htmlFor="equity_or_liability_account">
            <SelectInput id="equity_or_liability_account" name="equity_or_liability_account" defaultValue={initial?.equityOrLiabilityAccount ?? ""} options={[...accounts.map((a) => ({ value: a.name, label: a.name }))]} />
          </Field>
          <Field label="Remarks" htmlFor="remarks" wide>
            <TextArea id="remarks" name="remarks" rows={2} defaultValue={initial?.remarks ?? ""} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/shares/transfers" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
          <SubBtn mode={mode} />
        </div>
      </div>
    </form>
  );
}

function SubBtn({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save transfer" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteTransferAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
