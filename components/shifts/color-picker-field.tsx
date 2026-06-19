"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { TextInput } from "@/components/employee/form-bits";

/**
 * Hex-color picker tailored for the workspace brand palette.
 * - Row of preset swatches for one-click selection.
 * - Native color input (`<input type="color">`) as the "Custom" picker.
 * - Hex text input that stays in sync, so power-users can paste a value.
 *
 * Submits the hex string under `name` so the existing Server Action consumer
 * (which expects a plain `color` field) keeps working unchanged.
 */
const PRESETS: { label: string; value: string }[] = [
  { label: "Brand purple", value: "#1E1B53" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Sky", value: "#0EA5E9" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Emerald", value: "#10B981" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Rose", value: "#F43F5E" },
  { label: "Slate", value: "#64748B" },
];

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

function normalize(input: string): string {
  const v = input.trim();
  if (!v) return "";
  return v.startsWith("#") ? v : `#${v}`;
}

function isValid(hex: string): boolean {
  return HEX_RE.test(hex);
}

export function ColorPickerField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const initial = normalize(defaultValue ?? "");
  const [value, setValue] = useState<string>(initial);
  // The native <input type="color"> requires a 7-char #RRGGBB or it falls
  // back to black silently. Mirror only valid values into it.
  const swatchValue = isValid(value) ? value : "#1E1B53";

  return (
    <div className="space-y-3">
      {/* Preset palette */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = value.toUpperCase() === p.value.toUpperCase();
          return (
            <button
              key={p.value}
              type="button"
              title={`${p.label} (${p.value})`}
              aria-label={`${p.label} (${p.value})`}
              onClick={() => setValue(p.value)}
              className={cn(
                "relative h-7 w-7 rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active ? "border-foreground" : "border-input hover:border-foreground/50",
              )}
              style={{ backgroundColor: p.value }}
            >
              {active && (
                <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.45)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Native picker + hex input + hidden field for form submission */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${name}-native`}
          className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-input"
          style={{ backgroundColor: swatchValue }}
          title="Open color picker"
        >
          <span className="sr-only">Open color picker</span>
          <input
            id={`${name}-native`}
            type="color"
            value={swatchValue}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <TextInput
          id={`${name}-hex`}
          aria-label="Hex color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => setValue(normalize(e.target.value))}
          placeholder="#1E1B53"
          maxLength={7}
          spellCheck={false}
          invalid={Boolean(value) && !isValid(value)}
          className="font-mono uppercase"
        />

        {value && !isValid(value) && (
          <span className="text-[11px] text-destructive">Need 6 hex digits</span>
        )}
      </div>

      {/* The actual value that gets submitted. Empty when user clears the input. */}
      <input type="hidden" name={name} value={isValid(value) ? value : ""} />
    </div>
  );
}
