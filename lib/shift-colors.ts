/**
 * Shift Type `color` field is a Frappe Select with these 10 named options.
 * We map each name to a display hex so the swatch UI (edit form + detail
 * page) can render a colored square without needing the raw hex round-trip.
 *
 * Keep this list in lockstep with the Shift Type doctype `options` — if
 * Frappe adds/removes a color, update here and the picker updates too.
 */
export const SHIFT_COLOR_NAMES = [
  "Blue",
  "Cyan",
  "Fuchsia",
  "Green",
  "Lime",
  "Orange",
  "Pink",
  "Red",
  "Violet",
  "Yellow",
] as const;

export type ShiftColorName = (typeof SHIFT_COLOR_NAMES)[number];

export const SHIFT_COLOR_HEX: Record<ShiftColorName, string> = {
  Blue: "#3B82F6",
  Cyan: "#06B6D4",
  Fuchsia: "#D946EF",
  Green: "#22C55E",
  Lime: "#84CC16",
  Orange: "#F97316",
  Pink: "#EC4899",
  Red: "#EF4444",
  Violet: "#8B5CF6",
  Yellow: "#EAB308",
};

/** Returns the hex for a stored value, or null if it's unrecognised. */
export function shiftColorHex(name: string | null | undefined): string | null {
  if (!name) return null;
  const hit = SHIFT_COLOR_NAMES.find(
    (n) => n.toLowerCase() === name.trim().toLowerCase(),
  );
  return hit ? SHIFT_COLOR_HEX[hit] : null;
}
