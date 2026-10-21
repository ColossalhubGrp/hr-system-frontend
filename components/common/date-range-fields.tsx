"use client";

import { useEffect, useState } from "react";

/**
 * From/To date pair with cross-linked min/max and an inline error
 * when From > To. Blocks the enclosing form from submitting while
 * the range is invalid so the backend never has to reject it.
 *
 * Native min/max on the native date pickers also stops the user from
 * picking an out-of-range date in the first place.
 */
export function DateRangeFields({
  fromName = "from",
  toName = "to",
  fromLabel = "From",
  toLabel = "To",
  defaultFrom,
  defaultTo,
  fieldClassName = "flex flex-col gap-1",
  labelClassName = "text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
  inputClassName = "h-8 rounded-md border border-input bg-card px-2 text-[13px] focus-ring",
}: {
  fromName?: string;
  toName?: string;
  fromLabel?: string;
  toLabel?: string;
  defaultFrom?: string;
  defaultTo?: string;
  fieldClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  const [from, setFrom] = useState<string>(defaultFrom ?? "");
  const [to, setTo] = useState<string>(defaultTo ?? "");

  const invalid = Boolean(from && to && from > to);

  // Guard the enclosing form's submit: if the range is invalid we
  // prevent default so the request never fires. Picks up on mount via
  // the DOM — the two inputs don't own the submit button.
  useEffect(() => {
    const inputs = [
      document.querySelector<HTMLInputElement>(`input[name="${fromName}"]`),
      document.querySelector<HTMLInputElement>(`input[name="${toName}"]`),
    ];
    const form = inputs[0]?.form ?? inputs[1]?.form;
    if (!form) return;
    function onSubmit(e: SubmitEvent) {
      // Re-read live values so a user who edits via keyboard before
      // Enter is also caught.
      const a = (form!.querySelector(`input[name="${fromName}"]`) as HTMLInputElement | null)?.value || "";
      const b = (form!.querySelector(`input[name="${toName}"]`) as HTMLInputElement | null)?.value || "";
      if (a && b && a > b) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [fromName, toName]);

  return (
    <>
      <div className={fieldClassName}>
        <label htmlFor={fromName} className={labelClassName}>{fromLabel}</label>
        <input
          id={fromName}
          name={fromName}
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          aria-invalid={invalid}
          className={inputClassName}
        />
      </div>
      <div className={fieldClassName}>
        <label htmlFor={toName} className={labelClassName}>{toLabel}</label>
        <input
          id={toName}
          name={toName}
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          aria-invalid={invalid}
          className={inputClassName}
        />
      </div>
      {invalid && (
        <div className="sm:col-span-full text-[12px] text-destructive">
          {fromLabel} can&apos;t be after {toLabel}. Pick a valid range.
        </div>
      )}
    </>
  );
}
