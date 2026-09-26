"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { SelectInput } from "@/components/employee/form-bits";
import { createLinkMasterAction } from "@/lib/frappe/masters/create-link-master";

type Kind = "industry" | "market-segment" | "language" | "price-list" | "tax-category" | "payment-terms-template";

const LABELS: Record<Kind, { singular: string }> = {
  industry: { singular: "industry" },
  "market-segment": { singular: "market segment" },
  language: { singular: "language" },
  "price-list": { singular: "price list" },
  "tax-category": { singular: "tax category" },
  "payment-terms-template": { singular: "payment terms template" },
};

/**
 * SelectInput plus a small "+ Add" affordance. Useful for Link fields
 * whose target master starts out empty on a fresh tenant, so users
 * aren't stuck staring at a "—" they can't populate. The added value
 * is inserted right away and selected in-place; the form still posts
 * a plain string via the underlying <select>.
 */
export function CreatableSelect({
  id,
  name,
  kind,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  kind: Kind;
  defaultValue?: string | null;
  options: string[];
}) {
  const [opts, setOpts] = useState<string[]>(() => {
    const seen = new Set(options);
    const merged = [...options];
    if (defaultValue && !seen.has(defaultValue)) merged.unshift(defaultValue);
    return merged;
  });
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = LABELS[kind].singular;

  function onAdd() {
    const typed = window.prompt(`Add a new ${label}. What should we call it?`);
    if (!typed) return;
    const cleaned = typed.trim();
    if (!cleaned) return;
    setError(null);
    start(async () => {
      const res = await createLinkMasterAction(kind, cleaned);
      if (!res.ok) {
        setError(res.error);
        window.alert(res.error);
        return;
      }
      setOpts((prev) => (prev.includes(res.name) ? prev : [...prev, res.name].sort((a, b) => a.localeCompare(b))));
      setValue(res.name);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SelectInput
            id={id}
            name={name}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            options={opts.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={pending}
          className="inline-flex h-10 items-center gap-1 rounded-chip border border-input px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-60"
          title={`Add a new ${label}`}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
