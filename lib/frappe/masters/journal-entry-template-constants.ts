/** Client-safe voucher types for Journal Entry Template.
 *  Must match the doctype's Select options EXACTLY — Frappe v15
 *  rejects unknown Select values with a bare 417. The template
 *  doctype's list is shorter than the Journal Entry's (no Deferred
 *  Revenue/Expense etc.), so keep this in sync with
 *  colossal_journal_entry_template.json, not the JE form. */
export const VOUCHER_TYPES = [
  "Journal Entry",
  "Inter Company Journal Entry",
  "Bank Entry",
  "Cash Entry",
  "Credit Card Entry",
  "Debit Note",
  "Credit Note",
  "Contra Entry",
  "Excise Entry",
  "Write Off Entry",
  "Opening Entry",
  "Depreciation Entry",
  "Exchange Rate Revaluation",
] as const;
