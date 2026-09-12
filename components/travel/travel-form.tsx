"use client";

import Link from "next/link";
import type { Route } from "next";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { AlertCircle, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import type { FormState } from "@/app/(workspace)/hr/travel/actions";

const EMPTY: FormState = {};
type Action = (prev: FormState, form: FormData) => Promise<FormState>;

type Costing = {
  expense_type: string;
  amount: number;
  currency?: string;
  funded_amount?: number;
};
type Leg = {
  departure_date: string;
  from_location: string;
  to_location: string;
  mode_of_transport?: string;
  cost?: number;
};

export function TravelForm({
  action,
  employeeDirectory,
  currencies,
  cancelHref = "/hr/travel",
}: {
  action: Action;
  employeeDirectory: EmployeeDirectoryEntry[];
  currencies: string[];
  cancelHref?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [costings, setCostings] = useState<Costing[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <FormSection title="Request">
        <EmployeePickerField
          name="employee"
          required
          error={fe.employee}
          directory={employeeDirectory}
        />
        <Field label="Type" htmlFor="travel_type" required error={fe.travel_type}>
          <SelectInput
            id="travel_type"
            name="travel_type"
            options={["Domestic", "International"]}
            defaultValue="Domestic"
          />
        </Field>
        <Field label="Funding" htmlFor="travel_funding" required error={fe.travel_funding}>
          <SelectInput
            id="travel_funding"
            name="travel_funding"
            options={[
              "Fully Sponsored",
              "Partially Sponsored",
              "Fully Sponsored by Employee",
            ]}
            defaultValue="Fully Sponsored"
          />
        </Field>
        <Field label="From date" htmlFor="from_date" required error={fe.from_date}>
          <TextInput id="from_date" name="from_date" type="date" invalid={Boolean(fe.from_date)} />
        </Field>
        <Field label="To date" htmlFor="to_date" required error={fe.to_date}>
          <TextInput id="to_date" name="to_date" type="date" invalid={Boolean(fe.to_date)} />
        </Field>
        <Field label="Purpose" htmlFor="purpose_of_travel" required error={fe.purpose_of_travel} wide>
          <TextArea
            id="purpose_of_travel"
            name="purpose_of_travel"
            rows={2}
            invalid={Boolean(fe.purpose_of_travel)}
          />
        </Field>
        <Field label="Advance required" htmlFor="travel_advance_required">
          <label className="flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              id="travel_advance_required"
              name="travel_advance_required"
              className="h-4 w-4 accent-ink-800"
            />
            Employee needs a travel advance
          </label>
        </Field>
      </FormSection>

      <FormSection title="Costings">
        <div className="col-span-full flex flex-col gap-3">
          {costings.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <input
                placeholder="Expense type"
                value={c.expense_type}
                onChange={(e) => update(costings, setCostings, i, { expense_type: e.target.value })}
                className="input"
              />
              <input
                placeholder="Amount"
                type="number"
                step="0.01"
                value={c.amount ?? ""}
                onChange={(e) => update(costings, setCostings, i, { amount: Number(e.target.value) })}
                className="input"
              />
              <select
                value={c.currency ?? ""}
                onChange={(e) => update(costings, setCostings, i, { currency: e.target.value || undefined })}
                className="input"
              >
                <option value="">— default —</option>
                {currencies.map((cc) => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
              <input
                placeholder="Funded amount"
                type="number"
                step="0.01"
                value={c.funded_amount ?? ""}
                onChange={(e) =>
                  update(costings, setCostings, i, {
                    funded_amount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="input"
              />
              <button
                type="button"
                onClick={() => setCostings(costings.filter((_, x) => x !== i))}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-chip border border-hairline px-3 text-sm text-fall hover:bg-fall/[0.06] focus-ring"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setCostings([...costings, { expense_type: "", amount: 0 }])
            }
            className="inline-flex w-fit items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-3 py-1.5 text-sm text-ash-800 hover:bg-canvas/70 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Add cost line
          </button>
        </div>
      </FormSection>

      <FormSection title="Itinerary">
        <div className="col-span-full flex flex-col gap-3">
          {legs.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-6">
              <input
                type="date"
                value={l.departure_date}
                onChange={(e) => update(legs, setLegs, i, { departure_date: e.target.value })}
                className="input"
              />
              <input
                placeholder="From"
                value={l.from_location}
                onChange={(e) => update(legs, setLegs, i, { from_location: e.target.value })}
                className="input"
              />
              <input
                placeholder="To"
                value={l.to_location}
                onChange={(e) => update(legs, setLegs, i, { to_location: e.target.value })}
                className="input"
              />
              <input
                placeholder="Mode"
                value={l.mode_of_transport ?? ""}
                onChange={(e) =>
                  update(legs, setLegs, i, {
                    mode_of_transport: e.target.value || undefined,
                  })
                }
                className="input"
              />
              <input
                placeholder="Cost"
                type="number"
                step="0.01"
                value={l.cost ?? ""}
                onChange={(e) =>
                  update(legs, setLegs, i, {
                    cost: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="input"
              />
              <button
                type="button"
                onClick={() => setLegs(legs.filter((_, x) => x !== i))}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-chip border border-hairline px-3 text-sm text-fall hover:bg-fall/[0.06] focus-ring"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setLegs([
                ...legs,
                { departure_date: "", from_location: "", to_location: "" },
              ])
            }
            className="inline-flex w-fit items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-3 py-1.5 text-sm text-ash-800 hover:bg-canvas/70 focus-ring"
          >
            <Plus className="h-4 w-4" />
            Add itinerary leg
          </button>
        </div>
      </FormSection>

      <input type="hidden" name="costings_json" value={JSON.stringify(costings)} />
      <input type="hidden" name="itinerary_json" value={JSON.stringify(legs)} />

      <div className="-mx-1 mt-6 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
        <Submit />
      </div>

      <style jsx>{`
        .input {
          height: 2.25rem;
          border-radius: var(--radius-chip, 0.5rem);
          border: 1px solid rgb(var(--color-hairline) / 1);
          background: rgb(var(--color-surface, 255 255 255) / 1);
          padding: 0 0.6rem;
          font-size: 0.875rem;
          color: rgb(var(--color-ash-900, 15 23 42) / 1);
        }
      `}</style>
    </form>
  );
}

function update<T>(list: T[], set: (v: T[]) => void, i: number, patch: Partial<T>) {
  const next = list.slice();
  next[i] = { ...next[i], ...patch };
  set(next);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Create request"}
    </button>
  );
}
