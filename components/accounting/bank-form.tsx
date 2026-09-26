"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, TextInput } from "@/components/employee/form-bits";
import {
  createBankAction,
  updateBankAction,
  deleteBankAction,
  type FormState,
} from "@/app/(workspace)/accounting/banking/banks/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function BankForm({
  mode,
  name,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  initial?: { bankName: string; swiftNumber: string | null; website: string | null };
}) {
  const action = mode === "create" ? createBankAction : updateBankAction.bind(null, name ?? "");
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
      <FormSection title="Bank" description="The institution — accounts hang off it.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank name" htmlFor="bank_name" error={fe.bank_name} required>
            <TextInput id="bank_name" name="bank_name" defaultValue={initial?.bankName ?? ""} placeholder="e.g. CBZ Bank" />
          </Field>
          <Field label="SWIFT / BIC" htmlFor="swift_number">
            <TextInput id="swift_number" name="swift_number" defaultValue={initial?.swiftNumber ?? ""} placeholder="e.g. CBZWZWHA" />
          </Field>
          <Field label="Website" htmlFor="website">
            <TextInput id="website" name="website" defaultValue={initial?.website ?? ""} placeholder="https://…" />
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/accounting/banking/banks" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save bank" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteBankAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
