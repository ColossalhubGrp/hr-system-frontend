"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, Check, ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select as RadixSelect, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  createLinkOption, getQuickCreateSpec, searchLinkOptions, type LinkRow,
} from "@/lib/frappe/link-field";
import { isCreatable, type QuickCreateField } from "@/lib/frappe/link-field-registry";

/**
 * Shared Link combobox for every form field that references another
 * DocType. Behaviours:
 *
 *   - typeahead search against the DocType via a debounced server
 *     action (`searchLinkOptions`)
 *   - if the DocType is in LINK_REGISTRY, shows "+ Create <query>" at
 *     the bottom of the dropdown. Clicking opens a Dialog with the
 *     DocType's required fields, inserts via `createLinkOption`, then
 *     selects the newly-created row — no page navigation
 *   - participates in native form submission via a hidden `<input>`
 *     with the given `name` so Server Actions and `useFormState` keep
 *     working with no further changes
 *
 * Drop-in signature mirrors `<SelectInput>` where sensible so a form
 * can swap one for the other with just an import change.
 */
export function LinkField({
  id,
  name,
  doctype,
  value,
  defaultValue = "",
  onChange,
  placeholder,
  disabled,
  invalid,
  required,
  seed,
  filters,
  className,
}: {
  id?: string;
  /** Posted field name on the surrounding form. */
  name?: string;
  /** DocType to search (e.g. "Customer", "Colossal Account"). */
  doctype: string;
  /** Controlled value (name of the picked row). Omit for uncontrolled. */
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  /** Values the host form has for seed fields the quick-create needs
   *  (e.g. `{ company: "Colossal Hub" }` so creating a Cost Center
   *  inline is scoped to the right Company). */
  seed?: Record<string, string>;
  /** Additional filters applied to search queries. */
  filters?: Array<[string, string, unknown]>;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = isControlled ? (value ?? "") : internal;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [searching, startSearch] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Debounced search — fires 180ms after the user stops typing.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startSearch(async () => {
        const res = await searchLinkOptions(doctype, query, { filters, limit: 25 });
        if (res.ok) {
          setRows(res.rows);
          setSearchError(null);
        } else {
          setSearchError(res.error);
          setRows([]);
        }
      });
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, doctype]);

  function pick(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  const canCreate = isCreatable(doctype);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              invalid && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className={cn("truncate", !current && "text-muted-foreground")}>
              {current || placeholder || `Select ${doctype}…`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${doctype}…`}
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {searchError && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                {searchError}
              </div>
            )}
            {!searchError && rows.length === 0 && !searching && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {query ? "No matches." : "Start typing to search."}
              </div>
            )}
            {rows.map((r) => {
              const selected = r.name === current;
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => pick(r.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected && "bg-accent/60",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{r.label}</span>
                </button>
              );
            })}
          </div>

          {canCreate && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                Create new {doctype}{query ? ` "${query}"` : ""}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {canCreate && createOpen && (
        <QuickCreateDialog
          doctype={doctype}
          seed={seed}
          initialName={query}
          onCancel={() => setCreateOpen(false)}
          onCreated={(name) => {
            setCreateOpen(false);
            pick(name);
          }}
        />
      )}

      {name && <input type="hidden" name={name} value={current} required={required} />}
    </div>
  );
}

/** Inline Dialog that walks the user through the quick-create fields. */
function QuickCreateDialog({
  doctype,
  seed,
  initialName,
  onCancel,
  onCreated,
}: {
  doctype: string;
  seed?: Record<string, string>;
  initialName: string;
  onCancel: () => void;
  onCreated: (name: string) => void;
}) {
  const [spec, setSpec] = useState<{ label: string; fields: QuickCreateField[]; seedFields: string[] } | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const s = await getQuickCreateSpec(doctype);
      if (!s) return;
      setSpec(s);
      // Prefill: the first text field gets whatever the user typed in
      // the search box; seed fields come from the host form.
      const seeded: Record<string, unknown> = {};
      const firstText = s.fields.find((f) => f.type === "text");
      if (firstText && initialName) seeded[firstText.name] = initialName;
      for (const k of s.seedFields) if (seed?.[k]) seeded[k] = seed[k];
      setValues(seeded);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype]);

  const canSubmit = useMemo(() => {
    if (!spec) return false;
    return spec.fields.filter((f) => f.required).every((f) => !!values[f.name]);
  }, [spec, values]);

  function submit() {
    setError(null);
    setFieldErrors({});
    startSave(async () => {
      const res = await createLinkOption(doctype, { ...seed, ...values });
      if (res.ok) {
        onCreated(res.name);
      } else {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onCancel() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create {spec?.label ?? doctype}</DialogTitle>
          <DialogDescription>
            Fill in the essentials. You can edit everything else later from the
            {" "}{spec?.label ?? doctype} record.
          </DialogDescription>
        </DialogHeader>

        {!spec && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {spec && (
          <div className="flex flex-col gap-3 py-2">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {spec.fields.map((f) => (
              <QuickCreateFieldInput
                key={f.name}
                field={f}
                value={values[f.name]}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                error={fieldErrors[f.name]}
                seed={seed}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              `Create ${spec?.label ?? doctype}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateFieldInput({
  field,
  value,
  onChange,
  error,
  seed,
}: {
  field: QuickCreateField;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  seed?: Record<string, string>;
}) {
  const id = `qc-${field.name}`;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs font-medium">
        {field.label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      {field.type === "text" && (
        <Input
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          className={cn("h-9", error && "border-destructive")}
        />
      )}

      {field.type === "number" && (
        <Input
          id={id}
          type="number"
          min={field.min}
          value={(value as number | string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          className={cn("h-9", error && "border-destructive")}
        />
      )}

      {field.type === "check" && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      )}

      {field.type === "select" && (
        <RadixSelect
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id} className={cn("h-9", error && "border-destructive")}>
            <SelectValue placeholder={`Pick ${field.label}`} />
          </SelectTrigger>
          <SelectContent position="popper">
            {field.options.map((o) => (
              <SelectItem key={o || "__blank__"} value={o || "__blank__"}>
                {o || "—"}
              </SelectItem>
            ))}
          </SelectContent>
        </RadixSelect>
      )}

      {field.type === "link" && (
        <LinkField
          id={id}
          doctype={field.linkDoctype}
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
          placeholder={`Select ${field.label}`}
          seed={seed}
          invalid={!!error}
        />
      )}

      {error && (
        <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
