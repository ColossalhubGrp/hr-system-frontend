"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createPurchaseInvoiceAction,
  type FormState,
} from "@/app/(workspace)/accounting/purchase-invoices/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Supplier = { name: string; label: string };
type Item = { code: string; name: string; uom: string; standardRate: number };
type Company = { name: string; abbr: string; currency: string };

type Line = {
  item_code: string;
  qty: string;
  rate: string;
  uom: string;
};

const EMPTY_LINE = (): Line => ({ item_code: "", qty: "1", rate: "0", uom: "" });

export function NewPurchaseInvoiceForm({
  suppliers,
  items,
  companies,
  defaultCompany,
  defaultDate,
}: {
  suppliers: Supplier[];
  items: Item[];
  companies: Company[];
  defaultCompany: string;
  defaultDate: string;
}) {
  const [state, dispatch] = useFormState(createPurchaseInvoiceAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [lines, setLines] = useState<Line[]>([EMPTY_LINE()]);

  const itemsByCode = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of items) map.set(it.code, it);
    return map;
  }, [items]);

  const total = useMemo(() => {
    return lines.reduce((acc, l) => acc + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  }, [lines]);

  const onItemChange = (idx: number, code: string) => {
    const meta = itemsByCode.get(code);
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              item_code: code,
              uom: meta?.uom ?? l.uom,
              rate: meta && !Number(l.rate) ? String(meta.standardRate) : l.rate,
            }
          : l,
      ),
    );
  };

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Bill" description="Which supplier, on what dates, in which company.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier" htmlFor="supplier" error={fe.supplier} required>
            <SelectInput
              id="supplier"
              name="supplier"
              defaultValue=""
              placeholder="Select a supplier…"
              options={[
                ...suppliers.map((s) => ({ value: s.name, label: s.label })),
              ]}
            />
          </Field>
          <Field label="Company" htmlFor="company" error={fe.company} required>
            <SelectInput
              id="company"
              name="company"
              defaultValue={defaultCompany}
              options={companies.map((c) => ({ value: c.name, label: c.name }))}
            />
          </Field>
          <Field label="Posting Date" htmlFor="posting_date" error={fe.posting_date} required>
            <TextInput id="posting_date" type="date" name="posting_date" defaultValue={defaultDate} />
          </Field>
          <Field label="Due Date" htmlFor="due_date" error={fe.due_date}>
            <TextInput id="due_date" type="date" name="due_date" />
          </Field>
          <Field label="Supplier Bill No." htmlFor="bill_no" error={fe.bill_no}>
            <TextInput id="bill_no" name="bill_no" placeholder="Vendor invoice reference" />
          </Field>
          <Field label="Bill Date" htmlFor="bill_date" error={fe.bill_date}>
            <TextInput id="bill_date" name="bill_date" type="date" />
          </Field>
          <Field label="Remarks" htmlFor="remarks" error={fe.remarks} wide>
            <TextArea id="remarks" name="remarks" rows={2} placeholder="Optional notes." />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Items" description="What was purchased. Rate defaults from item master.">
        <div className="flex flex-col gap-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-5">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Item #{idx + 1}
                </label>
                <SelectInput
                  value={line.item_code}
                  placeholder="Select an item…"
                  options={[
                    ...items.map((it) => ({ value: it.code, label: `${it.name} (${it.code})` })),
                  ]}
                  onChange={(e) => onItemChange(idx, e.target.value)}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Qty</label>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.qty}
                  onChange={(e) =>
                    setLines((p) => p.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))
                  }
                  className="tabular-nums"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rate</label>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.rate}
                  onChange={(e) =>
                    setLines((p) => p.map((l, i) => (i === idx ? { ...l, rate: e.target.value } : l)))
                  }
                  className="tabular-nums"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Amount</label>
                <div className="rounded-chip border border-border/60 bg-card px-3 py-2 text-right text-sm tabular-nums text-foreground">
                  {((Number(line.qty) || 0) * (Number(line.rate) || 0)).toFixed(2)}
                </div>
              </div>
              <div className="col-span-1 flex items-end justify-end">
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                    className="mt-6 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove item ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {fe.items_json && <p className="text-xs text-destructive">{fe.items_json}</p>}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
              className="inline-flex items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
            <div className="text-sm">
              <span className="text-muted-foreground">Subtotal </span>
              <strong className="tabular-nums text-foreground">{total.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <input
          type="hidden"
          name="items_json"
          value={JSON.stringify(
            lines.map((l) => ({
              item_code: l.item_code,
              qty: Number(l.qty) || 0,
              rate: Number(l.rate) || 0,
              uom: l.uom || undefined,
            })),
          )}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={"/accounting/purchase-invoices" as Route}
          className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold text-white transition focus-ring",
        pending ? "bg-muted-foreground cursor-not-allowed" : "bg-ink-800 hover:bg-ink-700",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save draft"}
    </button>
  );
}
