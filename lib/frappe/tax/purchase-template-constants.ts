/** Client-safe constants for Purchase Taxes and Charges Template. */
export const CHARGE_TYPES = [
  "Actual",
  "On Net Total",
  "On Previous Row Amount",
  "On Previous Row Total",
  "On Item Quantity",
] as const;

export const CATEGORY = ["Total", "Valuation", "Valuation and Total"] as const;
export const ADD_DEDUCT = ["Add", "Deduct"] as const;
