"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveAccountsSettings } from "@/lib/frappe/masters/accounts-settings";
import { FrappeRequestError } from "@/lib/frappe/client";

export type FormState = { error?: string; ok?: boolean };

const bool = z.union([z.literal("on"), z.literal("")]).optional().transform((v) => (v === "on" ? 1 : 0));

const schema = z.object({
  auto_accounting_for_stock: bool,
  credit_controller: z.string().trim().optional().transform((v) => v || null),
  unlink_payment_on_cancellation_of_invoice: bool,
  unlink_advance_payment_on_cancelation_of_order: bool,
  book_asset_depreciation_entry_automatically: bool,
  add_taxes_from_item_tax_template: bool,
  determine_address_tax_category_from: z.string().trim().optional().transform((v) => v || null),
  over_billing_allowance: z.coerce.number().min(0).default(0),
  role_allowed_to_over_bill_against_stopping: z.string().trim().optional().transform((v) => v || null),
  show_balance_in_coa: bool,
  show_inclusive_tax_in_print: bool,
  merge_similar_account_heads: bool,
  show_payment_schedule_in_print: bool,
  automatically_process_deferred_accounting_entry: bool,
  book_deferred_entries_based_on: z.string().trim().optional().transform((v) => v || null),
  defer_accounting_for_all_parties_tagged: bool,
  book_deferred_entries_via_journal_entry: bool,
  submit_journal_entries_automatically: bool,
  override_accounts_permission_enforcement: bool,
  post_change_gl_entries: bool,
});

function toFormState(err: unknown): FormState {
  if (err instanceof FrappeRequestError) return { error: err.message || `Backend error (${err.status}).` };
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}

export async function saveAccountsSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };
  }
  try {
    await saveAccountsSettings(parsed.data as Record<string, unknown>);
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/accounting/masters/settings");
  return { ok: true };
}
