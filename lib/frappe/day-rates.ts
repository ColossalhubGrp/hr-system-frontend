import "server-only";
import { frappeCall } from "./client";

/**
 * Day-type taxonomy used by the rate engine. Order is significant: when a
 * date matches multiple types (e.g. a Sunday that's also a holiday), we
 * pick the highest-paid one — Holiday wins, then Sunday, then Saturday,
 * then Regular.
 */
export type DayType = "Regular" | "Saturday" | "Sunday" | "Holiday";

export type RatePolicy = {
  regular: number;
  saturday: number;
  sunday: number;
  holiday: number;
};

/** Sensible defaults — match what we set as Custom Field defaults on
 *  Shift Type so the system has a working policy out of the box. */
export const DEFAULT_RATE_POLICY: RatePolicy = {
  regular: 1.0,
  saturday: 1.5,
  sunday: 2.0,
  holiday: 2.5,
};

/** Given a YYYY-MM-DD date and a set of holiday dates, return the day type. */
export function dayType(iso: string, holidays: ReadonlySet<string>): DayType {
  const key = iso.slice(0, 10);
  if (holidays.has(key)) return "Holiday";
  const [y, m, d] = key.split("-").map(Number);
  // Parse as local-clock to avoid timezone surprises — these are bookkeeping
  // dates, not timestamps.
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const dow = dt.getDay(); // 0=Sun, 6=Sat
  if (dow === 0) return "Sunday";
  if (dow === 6) return "Saturday";
  return "Regular";
}

export function effectiveMultiplier(t: DayType, p: RatePolicy): number {
  switch (t) {
    case "Holiday":
      return p.holiday;
    case "Sunday":
      return p.sunday;
    case "Saturday":
      return p.saturday;
    case "Regular":
      return p.regular;
  }
}

/** Fetch the dates marked as holidays in the given Holiday List. */
export async function fetchHolidayDates(
  holidayList: string | null | undefined,
): Promise<Set<string>> {
  const set = new Set<string>();
  if (!holidayList) return set;
  try {
    const doc = await frappeCall<{ holidays?: Array<{ holiday_date: string }> }>(
      {
        method: "frappe.client.get",
        args: { doctype: "Holiday List", name: holidayList },
        as: "user",
      },
    );
    for (const h of doc.holidays ?? []) {
      if (h.holiday_date) set.add(h.holiday_date.slice(0, 10));
    }
  } catch {
    /* missing or unreadable list → empty set, every day reads as non-holiday */
  }
  return set;
}

/**
 * Build a per-day classification for an inclusive date range, ready for
 * rendering as a schedule preview.
 */
export function classifyRange(
  startIso: string,
  daysCount: number,
  holidays: ReadonlySet<string>,
  policy: RatePolicy,
): Array<{ date: string; type: DayType; multiplier: number }> {
  const [y, m, d] = startIso.slice(0, 10).split("-").map(Number);
  const cursor = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const out: Array<{ date: string; type: DayType; multiplier: number }> = [];
  for (let i = 0; i < daysCount; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    const t = dayType(iso, holidays);
    out.push({ date: iso, type: t, multiplier: effectiveMultiplier(t, policy) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
