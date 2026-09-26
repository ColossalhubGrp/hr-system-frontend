import "server-only";
import { frappeCall } from "../client";

/**
 * ERPNext "Accounts Settings" — the site-wide switches for the
 * accounting module (auto-perpetual, credit controller, unlink-on-
 * cancel, rounding, etc.). It's a Single DocType — only one row ever.
 */

export type AccountsSettings = {
  autoAccountingForStock: boolean;
  acquireStockUsingLandedCostForm: boolean;
  creditController: string | null;
  makeAccountingEntryForEveryStockMovement: boolean;
  unlinkPaymentOnCancellationOfInvoice: boolean;
  unlinkAdvancePaymentOnCancellationOfOrder: boolean;
  bookAssetDepreciationEntryAutomatically: boolean;
  addTaxesFromItemTaxTemplate: boolean;
  determineAddressTaxCategoryFrom: string | null;
  overBillingAllowance: number;
  roleAllowedToOverBillAgainstStopping: string | null;
  showBalanceInCoa: boolean;
  showInclusiveTaxInPrint: boolean;
  mergeSimilarAccountHeads: boolean;
  showPaymentScheduleInPrint: boolean;
  automaticallyProcessDeferredAccountingEntry: boolean;
  bookDeferredEntriesBasedOn: string | null;
  deferAccountingForAllPartiesTagged: boolean;
  bookDeferredEntriesViaJournalEntry: boolean;
  submitJournalEntriesAutomatically: boolean;
  overrideAccountsPermissionEnforcement: boolean;
  postChangeGlEntries: boolean;
};

export async function getAccountsSettings(): Promise<AccountsSettings> {
  const doc = await frappeCall<Record<string, unknown>>({
    method: "frappe.client.get",
    as: "user",
    args: { doctype: "Accounts Settings", name: "Accounts Settings" },
  });
  return {
    autoAccountingForStock: bool(doc.auto_accounting_for_stock),
    acquireStockUsingLandedCostForm: bool(doc.acquire_stock_using_landed_cost_form),
    creditController: str(doc.credit_controller),
    makeAccountingEntryForEveryStockMovement: bool(doc.make_accounting_entry_for_every_stock_movement),
    unlinkPaymentOnCancellationOfInvoice: bool(doc.unlink_payment_on_cancellation_of_invoice),
    unlinkAdvancePaymentOnCancellationOfOrder: bool(doc.unlink_advance_payment_on_cancelation_of_order),
    bookAssetDepreciationEntryAutomatically: bool(doc.book_asset_depreciation_entry_automatically),
    addTaxesFromItemTaxTemplate: bool(doc.add_taxes_from_item_tax_template),
    determineAddressTaxCategoryFrom: str(doc.determine_address_tax_category_from),
    overBillingAllowance: Number(doc.over_billing_allowance ?? 0),
    roleAllowedToOverBillAgainstStopping: str(doc.role_allowed_to_over_bill_against_stopping),
    showBalanceInCoa: bool(doc.show_balance_in_coa),
    showInclusiveTaxInPrint: bool(doc.show_inclusive_tax_in_print),
    mergeSimilarAccountHeads: bool(doc.merge_similar_account_heads),
    showPaymentScheduleInPrint: bool(doc.show_payment_schedule_in_print),
    automaticallyProcessDeferredAccountingEntry: bool(doc.automatically_process_deferred_accounting_entry),
    bookDeferredEntriesBasedOn: str(doc.book_deferred_entries_based_on),
    deferAccountingForAllPartiesTagged: bool(doc.defer_accounting_for_all_parties_tagged),
    bookDeferredEntriesViaJournalEntry: bool(doc.book_deferred_entries_via_journal_entry),
    submitJournalEntriesAutomatically: bool(doc.submit_journal_entries_automatically),
    overrideAccountsPermissionEnforcement: bool(doc.override_accounts_permission_enforcement),
    postChangeGlEntries: bool(doc.post_change_gl_entries),
  };
}

export type AccountsSettingsInput = Partial<{
  auto_accounting_for_stock: 0 | 1;
  credit_controller: string | null;
  unlink_payment_on_cancellation_of_invoice: 0 | 1;
  unlink_advance_payment_on_cancelation_of_order: 0 | 1;
  book_asset_depreciation_entry_automatically: 0 | 1;
  add_taxes_from_item_tax_template: 0 | 1;
  determine_address_tax_category_from: string | null;
  over_billing_allowance: number;
  role_allowed_to_over_bill_against_stopping: string | null;
  show_balance_in_coa: 0 | 1;
  show_inclusive_tax_in_print: 0 | 1;
  merge_similar_account_heads: 0 | 1;
  show_payment_schedule_in_print: 0 | 1;
  automatically_process_deferred_accounting_entry: 0 | 1;
  book_deferred_entries_based_on: string | null;
  defer_accounting_for_all_parties_tagged: 0 | 1;
  book_deferred_entries_via_journal_entry: 0 | 1;
  submit_journal_entries_automatically: 0 | 1;
  override_accounts_permission_enforcement: 0 | 1;
  post_change_gl_entries: 0 | 1;
}>;

export async function saveAccountsSettings(patch: AccountsSettingsInput): Promise<void> {
  await frappeCall({
    method: "frappe.client.set_value",
    as: "user",
    verb: "POST",
    args: {
      doctype: "Accounts Settings",
      name: "Accounts Settings",
      fieldname: patch,
    },
  });
}

function bool(v: unknown): boolean {
  return Number(v ?? 0) === 1;
}
function str(v: unknown): string | null {
  return (v as string | null) ?? null;
}
