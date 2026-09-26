"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Field, FormSection, SelectInput, TextInput } from "@/components/employee/form-bits";
import { saveAccountsSettingsAction, type FormState } from "@/app/(workspace)/accounting/masters/settings/actions";
import type { AccountsSettings } from "@/lib/frappe/masters/accounts-settings";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

export function AccountsSettingsForm({ initial }: { initial: AccountsSettings }) {
  const [state, dispatch] = useFormState(saveAccountsSettingsAction, EMPTY);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}
      {state.ok && (
        <div className="flex items-start gap-2 rounded-xl border border-rise/30 bg-rise/5 p-3 text-sm text-rise">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>Settings saved.</div>
        </div>
      )}

      <FormSection title="Stock & inventory" description="Whether stock movements post to the GL automatically.">
        <Toggle name="auto_accounting_for_stock" label="Perpetual inventory (auto-post stock moves)" defaultChecked={initial.autoAccountingForStock} />
      </FormSection>

      <FormSection title="Credit control" description="Who signs off on going over a customer's credit limit.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Credit controller (role)" htmlFor="credit_controller">
            <TextInput id="credit_controller" name="credit_controller" defaultValue={initial.creditController ?? ""} placeholder="e.g. Accounts Manager" />
          </Field>
          <Field label="Over-billing allowance (%)" htmlFor="over_billing_allowance">
            <TextInput id="over_billing_allowance" name="over_billing_allowance" type="number" step="0.01" min="0" defaultValue={String(initial.overBillingAllowance)} className="tabular-nums" />
          </Field>
          <Field label="Role allowed to over-bill" htmlFor="role_allowed_to_over_bill_against_stopping">
            <TextInput id="role_allowed_to_over_bill_against_stopping" name="role_allowed_to_over_bill_against_stopping" defaultValue={initial.roleAllowedToOverBillAgainstStopping ?? ""} placeholder="e.g. Sales Manager" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Cancellation policy" description="What happens to payments and advances when the parent doc is cancelled.">
        <Toggle name="unlink_payment_on_cancellation_of_invoice" label="Unlink payment when invoice is cancelled" defaultChecked={initial.unlinkPaymentOnCancellationOfInvoice} />
        <Toggle name="unlink_advance_payment_on_cancelation_of_order" label="Unlink advance payment when order is cancelled" defaultChecked={initial.unlinkAdvancePaymentOnCancellationOfOrder} />
        <Toggle name="post_change_gl_entries" label="Allow posting changes to already-posted ledger entries" defaultChecked={initial.postChangeGlEntries} />
      </FormSection>

      <FormSection title="Tax handling" description="How taxes flow from item templates to invoices.">
        <Toggle name="add_taxes_from_item_tax_template" label="Add taxes from item tax template" defaultChecked={initial.addTaxesFromItemTaxTemplate} />
        <Field label="Determine address tax category from" htmlFor="determine_address_tax_category_from">
          <SelectInput
            id="determine_address_tax_category_from"
            name="determine_address_tax_category_from"
            defaultValue={initial.determineAddressTaxCategoryFrom ?? ""}
            options={[
              { value: "Billing Address", label: "Billing Address" },
              { value: "Shipping Address", label: "Shipping Address" },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection title="Print & display" description="How things render on printed vouchers and CoA.">
        <Toggle name="show_balance_in_coa" label="Show account balance in Chart of Accounts" defaultChecked={initial.showBalanceInCoa} />
        <Toggle name="show_inclusive_tax_in_print" label="Show inclusive tax on printed invoices" defaultChecked={initial.showInclusiveTaxInPrint} />
        <Toggle name="show_payment_schedule_in_print" label="Show payment schedule on printed invoices" defaultChecked={initial.showPaymentScheduleInPrint} />
        <Toggle name="merge_similar_account_heads" label="Merge similar account heads on reports" defaultChecked={initial.mergeSimilarAccountHeads} />
      </FormSection>

      <FormSection title="Deferred revenue / expense" description="How multi-period revenue/expense recognition posts.">
        <Toggle name="automatically_process_deferred_accounting_entry" label="Automatically process deferred entries via scheduler" defaultChecked={initial.automaticallyProcessDeferredAccountingEntry} />
        <Toggle name="defer_accounting_for_all_parties_tagged" label="Defer accounting for all parties tagged" defaultChecked={initial.deferAccountingForAllPartiesTagged} />
        <Toggle name="book_deferred_entries_via_journal_entry" label="Book deferred entries as a Journal Entry (instead of posting straight to the ledger)" defaultChecked={initial.bookDeferredEntriesViaJournalEntry} />
        <Field label="Book deferred entries based on" htmlFor="book_deferred_entries_based_on">
          <SelectInput
            id="book_deferred_entries_based_on"
            name="book_deferred_entries_based_on"
            defaultValue={initial.bookDeferredEntriesBasedOn ?? ""}
            options={[
              { value: "Days", label: "Days" },
              { value: "Months", label: "Months" },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection title="Automation" description="Automations that write to the ledger without a human click.">
        <Toggle name="submit_journal_entries_automatically" label="Submit journal entries automatically" defaultChecked={initial.submitJournalEntriesAutomatically} />
        <Toggle name="book_asset_depreciation_entry_automatically" label="Book asset depreciation entry automatically" defaultChecked={initial.bookAssetDepreciationEntryAutomatically} />
        <Toggle name="override_accounts_permission_enforcement" label="Override accounts permission enforcement" defaultChecked={initial.overrideAccountsPermissionEnforcement} />
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href={"/accounting" as Route} className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40">Cancel</Link>
        <SubmitBtn />
      </div>
    </form>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4" />
      <span className="text-foreground">{label}</span>
    </label>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring", pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700")}>
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}
