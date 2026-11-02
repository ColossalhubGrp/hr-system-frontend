/**
 * Brand-brief formatting helpers (brief §4.4):
 *  - Currency is NAMED: "US$450.00", "ZiG 12,400.00" — never a bare $
 *    where two currencies are in play.
 *  - Dates read "1 September 2026" in prose; ISO stays in data.
 */

export function ccyLabel(code: string | null | undefined): string {
  const c = (code || "").toUpperCase();
  if (c === "USD") return "US$";
  if (c === "ZWG" || c === "ZIG" || c === "ZWL") return "ZiG ";
  return c ? `${c} ` : "";
}

export function formatMoney(n: number, code: string | null | undefined): string {
  return `${ccyLabel(code)}${(n ?? 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-09-01" → "1 September 2026"; passes through anything unparsable. */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return String(iso);
  return LONG_DATE.format(d);
}
