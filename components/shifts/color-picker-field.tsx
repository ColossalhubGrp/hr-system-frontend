"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Swatch-only color picker. Users pick from a fixed palette — the hex code
 * is submitted as a hidden field so the server contract stays unchanged,
 * but never shown in the UI (nobody remembers `#14B8A6`).
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

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeToPreset(input: string | null | undefined): string {
  if (!input) return PRESETS[0].value;
  const v = input.trim().toUpperCase();
  const hex = v.startsWith("#") ? v : `#${v}`;
  if (!HEX_RE.test(hex)) return PRESETS[0].value;
  // If it matches a preset, snap to that one; otherwise pretend it was
  // brand purple so the swatch row always shows one active.
  const hit = PRESETS.find((p) => p.value.toUpperCase() === hex);
  return hit ? hit.value : PRESETS[0].value;
}

export function ColorPickerField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState<string>(() => normalizeToPreset(defaultValue));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = value.toUpperCase() === p.value.toUpperCase();
          return (
            <button
              key={p.value}
              type="button"
              title={p.label}
              aria-label={p.label}
              aria-pressed={active}
              onClick={() => setValue(p.value)}
              className={cn(
                "relative h-8 w-8 rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active ? "border-foreground" : "border-input hover:border-foreground/50",
              )}
              style={{ backgroundColor: p.value }}
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
