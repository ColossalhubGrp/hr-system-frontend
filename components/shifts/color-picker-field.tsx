"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SHIFT_COLOR_HEX, SHIFT_COLOR_NAMES, type ShiftColorName } from "@/lib/shift-colors";

/**
 * Swatch-only color picker for Shift Type.
 *
 * The Frappe Shift Type doctype stores `color` as a Select field whose
 * options are named colors (Blue, Cyan, Fuchsia, Green, …). Sending a hex
 * value gets silently dropped on save, which is why the field kept coming
 * back empty. So the picker submits the color *name*, and we render the
 * swatch background from a name → hex map defined in one place.
 */

function normalize(input: string | null | undefined): ShiftColorName {
  if (!input) return "Blue";
  const v = input.trim();
  // If we ever encounter a legacy hex value stored from a previous build,
  // fall back to Blue rather than blowing up.
  const hit = SHIFT_COLOR_NAMES.find(
    (n) => n.toLowerCase() === v.toLowerCase(),
  );
  return hit ?? "Blue";
}

export function ColorPickerField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState<ShiftColorName>(() => normalize(defaultValue));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {SHIFT_COLOR_NAMES.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              title={n}
              aria-label={n}
              aria-pressed={active}
              onClick={() => setValue(n)}
              className={cn(
                "relative h-8 w-8 rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active ? "border-foreground" : "border-input hover:border-foreground/50",
              )}
              style={{ backgroundColor: SHIFT_COLOR_HEX[n] }}
            >
              {active && (
                <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
              )}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
