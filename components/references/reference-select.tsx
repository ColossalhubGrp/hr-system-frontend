"use client";

import { useId, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReferenceData } from "@/lib/references/use-reference-data";

/**
 * A drop-in shadcn Select whose options come from a reference-data master.
 *
 *   <ReferenceSelect master="Department" name="department" defaultValue={...} />
 *
 * For controlled use, pass `value` + `onValueChange`. For uncontrolled
 * form-submission use, pass `name` (and optionally `defaultValue`) — the
 * component renders a hidden <input> so the chosen value gets submitted
 * with the surrounding <form>.
 *
 * Loading + empty + error states are handled inline; no consumer code
 * needed to render them.
 */
export interface ReferenceSelectProps {
  /** Master DocType name, e.g. "Department". */
  master: string;
  /** Form field name — only required for uncontrolled form-action use. */
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  /** Render disabled rows too (default: hide them). */
  includeInactive?: boolean;
  /** Optional company scope (passes through to the API). */
  company?: string;
  /** Disable the control entirely. */
  disabled?: boolean;
  /** Extra trigger className. */
  className?: string;
  /** Required indicator on the hidden input. */
  required?: boolean;
  /** id for label htmlFor wiring. */
  id?: string;
}

export function ReferenceSelect({
  master,
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select…",
  includeInactive = false,
  company,
  disabled,
  className,
  required,
  id,
}: ReferenceSelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const current = controlled ? (value ?? "") : internal;

  const { rows, loading, error } = useReferenceData(master, {
    includeInactive,
    company,
    limit: 200,
  });

  // If the currently-selected value isn't in `rows` (e.g. it was just
  // deactivated, or rows haven't loaded yet for an edit form), keep it
  // visible so the form doesn't silently lose the value.
  const optionList = useMemo(() => {
    const list = rows.map((r) => ({
      value: r.name,
      label: r.title,
      inactive: !r.is_active,
    }));
    if (current && !list.some((o) => o.value === current)) {
      list.unshift({ value: current, label: current, inactive: false });
    }
    return list;
  }, [rows, current]);

  return (
    <div className="relative">
      <Select
        value={current || undefined}
        defaultValue={!controlled ? (defaultValue || undefined) : undefined}
        onValueChange={(v) => {
          if (!controlled) setInternal(v);
          onValueChange?.(v);
        }}
        disabled={disabled || (!!error && rows.length === 0)}
      >
        <SelectTrigger id={triggerId} className={cn("h-10", className)}>
          <SelectValue placeholder={loading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {loading && rows.length === 0 && (
            <div className="flex items-center justify-center px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Loading {master}…
            </div>
          )}
          {!loading && !error && optionList.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No {master.toLowerCase()} options yet.
            </div>
          )}
          {error && (
            <div className="px-2 py-3 text-xs text-destructive">{error}</div>
          )}
          {optionList.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className={cn(o.inactive && "text-muted-foreground italic")}
            >
              {o.label}
              {o.inactive && (
                <span className="ml-2 text-[10px] uppercase">inactive</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hidden input so the value submits with surrounding <form>s. The
          shadcn Select doesn't render a form-participating control on its
          own, so this is how form actions pick the value up. */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
        />
      )}
    </div>
  );
}
