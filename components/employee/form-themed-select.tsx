"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type ThemedSelectOption = string | { value: string; label: string };

/**
 * Form-friendly wrapper around shadcn's Radix-based <Select>.
 *
 * The default <SelectInput> in form-bits uses a NATIVE <select>, which
 * (a) ignores our theme in dark mode, (b) renders a browser-chrome
 * popup that can position anywhere on screen (Linux Chromium drops it
 * at the viewport top when the trigger sits inside a scroll container),
 * and (c) has no search / keyboard-rich UX.
 *
 * This component gives us the shadcn-styled, Popper-positioned,
 * theme-aware dropdown AND still participates in native form submission:
 * a hidden <input> mirrors the current value, so `useFormState` actions
 * read the field exactly like a native select.
 *
 * Call it the same way as SelectInput — swap `<SelectInput …>` for
 * `<ThemedSelect …>` and it's a drop-in.
 */
export function ThemedSelect({
  name,
  id,
  defaultValue = "",
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  invalid,
  disabled,
  required,
  className,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  // Controlled when `value` is passed; otherwise maintain our own
  // state so the hidden input gets the right value for form posts.
  // Radix's <Select> refuses an empty-string item value, so we
  // translate "" ↔ EMPTY_SENTINEL at the boundary. The hidden
  // input (which is what the server reads) always sees the real
  // "" when the "Any ..." placeholder option is chosen.
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue);
  const current = isControlled ? (value ?? "") : internal;

  const handleChange = (v: string) => {
    const real = v === EMPTY_SENTINEL ? "" : v;
    if (!isControlled) setInternal(real);
    onValueChange?.(real);
  };

  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );

  return (
    <>
      <Select
        value={current === "" ? EMPTY_SENTINEL : current}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-10",
            invalid && "border-destructive focus:ring-destructive",
            className,
          )}
          aria-invalid={invalid || undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* `position="popper"` + anchored side+sideOffset = the
            dropdown always opens BELOW the trigger (or above only
            when there's no room), with collision-aware clamping.
            Default `item-aligned` positioning tried to line up the
            selected item with the trigger, which pushed the whole
            menu above the viewport and clipped the top of the list. */}
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          className="max-h-[min(60vh,320px)] w-[var(--radix-select-trigger-width)]"
        >
          {items.map((o) => (
            <SelectItem
              key={o.value || EMPTY_SENTINEL}
              value={o.value === "" ? EMPTY_SENTINEL : o.value}
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Hidden input so native form submission + Server Actions
          see the selected value under the given `name`. Radix's
          Select itself doesn't contribute to form data. */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
        />
      )}
    </>
  );
}

/** Radix forbids value="" on SelectItem; this sentinel stands in. */
const EMPTY_SENTINEL = "__empty__";
