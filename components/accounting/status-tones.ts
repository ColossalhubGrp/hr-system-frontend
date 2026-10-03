/**
 * Shared status-pill palette for accounting vouchers (Journal Entry,
 * Sales Invoice, Purchase Invoice, Payment Entry, …). Mirrors the
 * ERPNext colours our users already know:
 *   Draft           → amber   (not yet posted)
 *   Submitted       → sky     (posted, no money moved yet)
 *   Paid            → emerald (settled in full)
 *   Partly Paid     → amber   (part of grand total still owed)
 *   Unpaid          → amber   (nothing paid yet, invoice still open)
 *   Overdue         → rose    (unpaid past due date — needs attention)
 *   Return / Credit → sky     (negative-value counter-document)
 *   Cancelled       → rose    (reversed after submit)
 */
export const VOUCHER_STATUS_TONES: Record<string, string> = {
  // Pre-submit
  Draft: "bg-amber-100 text-amber-800 ring-amber-200",

  // Submitted but no payment state yet (JE, PE)
  Submitted: "bg-sky-100 text-sky-800 ring-sky-200",

  // Receivable / payable settled
  Paid: "bg-emerald-100 text-emerald-700 ring-emerald-200",

  // Settled with discounting
  "Unpaid and Discounted": "bg-amber-100 text-amber-800 ring-amber-200",
  "Partly Paid and Discounted": "bg-amber-100 text-amber-800 ring-amber-200",
  "Overdue and Discounted": "bg-rose-100 text-rose-700 ring-rose-200",

  // Partially settled / outstanding
  "Partly Paid": "bg-amber-100 text-amber-800 ring-amber-200",
  Unpaid: "bg-amber-100 text-amber-800 ring-amber-200",

  // Red flag
  Overdue: "bg-rose-100 text-rose-700 ring-rose-200",

  // Reversal / counter-document
  Return: "bg-sky-100 text-sky-800 ring-sky-200",
  "Credit Note Issued": "bg-sky-100 text-sky-800 ring-sky-200",
  "Debit Note Issued": "bg-sky-100 text-sky-800 ring-sky-200",
  "Internal Transfer": "bg-sky-100 text-sky-800 ring-sky-200",

  // After-the-fact kill
  Cancelled: "bg-rose-100 text-rose-700 ring-rose-200",
};
