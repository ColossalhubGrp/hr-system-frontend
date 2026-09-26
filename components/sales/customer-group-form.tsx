"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Trash2 } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import {
  createCustomerGroupAction,
  updateCustomerGroupAction,
  deleteCustomerGroupAction,
  type FormState,
} from "@/app/(workspace)/sales/customer-groups/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function CustomerGroupForm({
  mode,
  name,
  parents,
  initial,
}: {
  mode: "create" | "edit";
  name?: string;
  parents: string[];
  initial?: { customerGroupName: string; parent: string | null; isGroup: boolean };
}) {
  const action = mode === "create" ? createCustomerGroupAction : updateCustomerGroupAction.bind(null, name ?? "");
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
      <FormSection title="Group" description="Bucket customers by segment, size or region.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="customer_group_name" error={fe.customer_group_name} required>
            <TextInput id="customer_group_name" name="customer_group_name" defaultValue={initial?.customerGroupName ?? ""} placeholder="e.g. Retail, Wholesale" />
          </Field>
          <Field label="Parent group" htmlFor="parent_customer_group">
            <SelectInput
              id="parent_customer_group"
              name="parent_customer_group"
              defaultValue={initial?.parent ?? ""}
              options={[{ value: "", label: "— (top level)" }, ...parents.map((p) => ({ value: p, label: p }))]}
            />
          </Field>
          <Field label="Is a container" htmlFor="is_group">
            <label className="flex items-center gap-2 text-sm">
              <input id="is_group" type="checkbox" name="is_group" defaultChecked={initial?.isGroup ?? false} className="h-4 w-4" />
              <span className="text-muted-foreground">Group other groups instead of holding customers directly.</span>
            </label>
          </Field>
        </div>
      </FormSection>
      <div className="flex items-center justify-between">
        {mode === "edit" && name && <DelBtn name={name} />}
        <div className="ml-auto flex items-center gap-2">
          <Link href={"/sales/customer-groups" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
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
      <Save className="h-4 w-4" /> {pending ? "Saving…" : mode === "create" ? "Save group" : "Save changes"}
    </button>
  );
}

function DelBtn({ name }: { name: string }) {
  const onSubmit = async () => { await deleteCustomerGroupAction(name); };
  return (
    <form action={onSubmit}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-chip border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={(e) => { if (!confirm(`Delete "${name}"?`)) e.preventDefault(); }}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </form>
  );
}
