"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  createItemAction,
  updateItemAction,
  type FormState,
} from "@/app/(workspace)/accounting/items/actions";
import { cn } from "@/lib/cn";

const EMPTY: FormState = {};

type Opt = { name: string };
type Company = { name: string; abbr: string; currency: string };

export type ItemEditInitial = {
  name: string;
  itemCode: string;
  itemName: string;
  itemGroup: string | null;
  stockUom: string;
  standardRate: number;
  description: string | null;
  image: string | null;
  isStockItem: boolean;
  isFixedAsset: boolean;
  hasVariants: boolean;
  hasBatchNo: boolean;
  hasSerialNo: boolean;
  openingStock: number;
  valuationRate: number;
  shelfLifeInDays: number;
  endOfLife: string | null;
  weightPerUnit: number;
  weightUom: string | null;
  disabled: boolean;
  itemDefaults: Array<{
    company: string;
    defaultWarehouse: string | null;
    incomeAccount: string | null;
    expenseAccount: string | null;
  }>;
};

type DefaultsRow = {
  company: string;
  default_warehouse: string;
  income_account: string;
  expense_account: string;
};

const EMPTY_DEFAULTS = (company = ""): DefaultsRow => ({
  company,
  default_warehouse: "",
  income_account: "",
  expense_account: "",
});

export function ItemForm({
  itemGroups,
  uoms,
  companies,
  initial,
}: {
  itemGroups: Opt[];
  uoms: Opt[];
  companies: Company[];
  initial?: ItemEditInitial;
}) {
  const isEdit = Boolean(initial);
  const boundAction = isEdit
    ? updateItemAction.bind(null, initial!.name)
    : createItemAction;
  const [state, dispatch] = useFormState(boundAction, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [defaults, setDefaults] = useState<DefaultsRow[]>(() => {
    if (initial?.itemDefaults.length) {
      return initial.itemDefaults.map((d) => ({
        company: d.company,
        default_warehouse: d.defaultWarehouse ?? "",
        income_account: d.incomeAccount ?? "",
        expense_account: d.expenseAccount ?? "",
      }));
    }
    return [];
  });

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <FormSection title="Basics" description="Code and name are how this item is referenced on every invoice and stock entry.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Item Code" htmlFor="item_code" error={fe.item_code} required>
            <TextInput
              id="item_code"
              name="item_code"
              defaultValue={initial?.itemCode ?? ""}
              placeholder="e.g. SRV-CONSULT-01"
              readOnly={isEdit}
            />
          </Field>
          <Field label="Item Name" htmlFor="item_name" error={fe.item_name} required>
            <TextInput
              id="item_name"
              name="item_name"
              defaultValue={initial?.itemName ?? ""}
              placeholder="Human-readable name"
            />
          </Field>
          <Field label="Item Group" htmlFor="item_group" error={fe.item_group} required>
            <SelectInput
              id="item_group"
              name="item_group"
              defaultValue={initial?.itemGroup ?? ""}
              placeholder="Select a group…"
              options={itemGroups.map((g) => ({ value: g.name, label: g.name }))}
            />
          </Field>
          <Field label="Unit of Measure" htmlFor="stock_uom" error={fe.stock_uom} required>
            <SelectInput
              id="stock_uom"
              name="stock_uom"
              defaultValue={initial?.stockUom ?? "Nos"}
              options={uoms.map((u) => ({ value: u.name, label: u.name }))}
            />
          </Field>
          <Field label="Standard Rate" htmlFor="standard_rate" error={fe.standard_rate} hint="Default selling price; invoice lines inherit this.">
            <TextInput
              id="standard_rate"
              name="standard_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.standardRate ? String(initial.standardRate) : "0"}
              className="tabular-nums"
            />
          </Field>
          <Field label="Image URL" htmlFor="image" error={fe.image} hint="Public URL for the item image. Optional.">
            <TextInput
              id="image"
              name="image"
              defaultValue={initial?.image ?? ""}
              placeholder="https://…"
            />
          </Field>
          <Field label="Description" htmlFor="description" error={fe.description} wide>
            <TextArea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder="What this item is, what makes it distinct, specs."
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Flags" description="How this item behaves across stock, invoicing and variant handling.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HiddenCheckbox name="is_stock_item" label="Maintain stock" defaultChecked={initial?.isStockItem ?? true} />
          <HiddenCheckbox name="is_fixed_asset" label="Is a fixed asset" defaultChecked={initial?.isFixedAsset ?? false} />
          <HiddenCheckbox name="has_variants" label="Has variants" defaultChecked={initial?.hasVariants ?? false} />
          <HiddenCheckbox name="has_batch_no" label="Track by batch" defaultChecked={initial?.hasBatchNo ?? false} />
          <HiddenCheckbox name="has_serial_no" label="Track by serial no." defaultChecked={initial?.hasSerialNo ?? false} />
          <HiddenCheckbox name="disabled" label="Disabled" defaultChecked={initial?.disabled ?? false} />
        </div>
      </FormSection>

      <FormSection title="Inventory" description="Stock-only numbers. Ignored for pure service items.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening Stock" htmlFor="opening_stock" error={fe.opening_stock} hint="Only used on first save.">
            <TextInput
              id="opening_stock"
              name="opening_stock"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.openingStock ? String(initial.openingStock) : "0"}
              className="tabular-nums"
            />
          </Field>
          <Field label="Valuation Rate" htmlFor="valuation_rate" error={fe.valuation_rate} hint="Per-unit cost for the opening stock.">
            <TextInput
              id="valuation_rate"
              name="valuation_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.valuationRate ? String(initial.valuationRate) : "0"}
              className="tabular-nums"
            />
          </Field>
          <Field label="Shelf Life (days)" htmlFor="shelf_life_in_days" error={fe.shelf_life_in_days}>
            <TextInput
              id="shelf_life_in_days"
              name="shelf_life_in_days"
              type="number"
              step="1"
              min="0"
              defaultValue={initial?.shelfLifeInDays ? String(initial.shelfLifeInDays) : "0"}
              className="tabular-nums"
            />
          </Field>
          <Field label="End of Life" htmlFor="end_of_life" error={fe.end_of_life} hint="After this date, the item is auto-disabled.">
            <TextInput
              id="end_of_life"
              name="end_of_life"
              type="date"
              defaultValue={initial?.endOfLife ?? ""}
            />
          </Field>
          <Field label="Weight per Unit" htmlFor="weight_per_unit" error={fe.weight_per_unit}>
            <TextInput
              id="weight_per_unit"
              name="weight_per_unit"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.weightPerUnit ? String(initial.weightPerUnit) : "0"}
              className="tabular-nums"
            />
          </Field>
          <Field label="Weight UOM" htmlFor="weight_uom" error={fe.weight_uom}>
            <SelectInput
              id="weight_uom"
              name="weight_uom"
              defaultValue={initial?.weightUom ?? ""}
              options={[{ value: "", label: "—" }, ...uoms.map((u) => ({ value: u.name, label: u.name }))]}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Per-company defaults"
        description="Override income / expense accounts and default warehouse per company. The invoice line uses these when the item is picked."
      >
        <div className="flex flex-col gap-3">
          {defaults.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 items-start gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Company</label>
                <SelectInput
                  value={row.company}
                  placeholder="Select…"
                  options={companies.map((c) => ({ value: c.name, label: c.name }))}
                  onChange={(e) =>
                    setDefaults((p) => p.map((r, i) => (i === idx ? { ...r, company: e.target.value } : r)))
                  }
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Default Warehouse</label>
                <TextInput
                  value={row.default_warehouse}
                  onChange={(e) =>
                    setDefaults((p) => p.map((r, i) => (i === idx ? { ...r, default_warehouse: e.target.value } : r)))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Income Account</label>
                <TextInput
                  value={row.income_account}
                  onChange={(e) =>
                    setDefaults((p) => p.map((r, i) => (i === idx ? { ...r, income_account: e.target.value } : r)))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-11 md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Expense Account</label>
                <TextInput
                  value={row.expense_account}
                  onChange={(e) =>
                    setDefaults((p) => p.map((r, i) => (i === idx ? { ...r, expense_account: e.target.value } : r)))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-1 flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => setDefaults((p) => p.filter((_, i) => i !== idx))}
                  className="mt-6 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove default ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDefaults((p) => [...p, EMPTY_DEFAULTS(companies[0]?.name ?? "")])}
            className="inline-flex w-fit items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add company override
          </button>
        </div>
        <input
          type="hidden"
          name="defaults_json"
          value={JSON.stringify(defaults.filter((d) => d.company))}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={
            (isEdit
              ? `/accounting/items/${encodeURIComponent(initial!.name)}`
              : "/accounting/items") as Route
          }
          className="rounded-chip border border-input px-4 py-2 text-sm font-semibold hover:bg-muted/40"
        >
          Cancel
        </Link>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}

/** Checkbox that posts "1" when checked, "0" otherwise — Frappe
 *  Check fields are stored as 0/1 integers. Keeps the server-side
 *  schema uniform. */
function HiddenCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      {label}
      <input type="hidden" name={name} value={checked ? "1" : "0"} />
    </label>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  const label = isEdit
    ? pending ? "Saving changes…" : "Save changes"
    : pending ? "Saving…" : "Save item";
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
      {label}
    </button>
  );
}
