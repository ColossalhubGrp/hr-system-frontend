"use client";

import { useId } from "react";
import { Field } from "@/components/employee/form-bits";

/** Searchable currency picker — plain <input> backed by a <datalist>
 *  so users can type "zim", "kes", "cfa" to narrow the ~50 options.
 *  Browser-native typeahead, no JS state, works in every modern
 *  browser. Value is a 3-letter currency code; the form action posts
 *  the raw string. */
export function CurrencyPickerField({
  name,
  label = "Currency",
  required,
  error,
  hint,
  defaultValue,
  placeholder = "Type to search (e.g. ZWG, USD, ZAR)",
  currencies,
}: {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
  currencies: string[];
}) {
  const dlId = useId();
  return (
    <Field label={label} htmlFor={name} required={required} error={error} hint={hint}>
      <input
        id={name}
        name={name}
        list={dlId}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={
          "h-10 w-full rounded-md border border-hairline bg-white px-3 text-sm uppercase tracking-wider focus-ring" +
          (error ? " border-fall" : "")
        }
      />
      <datalist id={dlId}>
        {currencies.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Field>
  );
}
