"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Field,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/employee/form-bits";
import type { FormState } from "@/app/(workspace)/settings/overtime/actions";
import type {
  CalculationMethod,
  DayType,
  OvertimeRuleFull,
  ThresholdType,
} from "@/lib/frappe/overtime";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const EMPTY: FormState = {};

const THRESHOLD_TYPES: ThresholdType[] = [
  "Daily Hours",
  "Weekly Hours",
  "Consecutive Days",
  "Shift Based",
];
const DAY_TYPES: DayType[] = ["All Days", "Weekday", "Weekend", "Holiday Only"];
const METHODS: CalculationMethod[] = ["Multiplier", "Fixed Amount", "Tiered"];

type TierDraft = {
  from: number;
  to: number | null;
  mult: number;
  note: string;
};

export function OvertimeRuleForm({
  mode,
  action,
  cancelHref,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  cancelHref: string;
  initial?: OvertimeRuleFull;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};
  const [method, setMethod] = useState<CalculationMethod>(
    initial?.calculationMethod ?? "Multiplier",
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    initial?.tiers?.map((t) => ({
      from: t.fromMinute,
      to: t.toMinute,
      mult: t.rateMultiplier,
      note: t.description ?? "",
    })) ?? [],
  );

  function addTier() {
    setTiers((prev) => {
      const lastTo = prev.length ? (prev[prev.length - 1]?.to ?? 60) : 0;
      return [
        ...prev,
        { from: lastTo, to: lastTo + 60, mult: prev.length === 0 ? 1.25 : 1.5, note: "" },
      ];
    });
  }
  function removeTier(idx: number) {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  }
  function patchTier(idx: number, patch: Partial<TierDraft>) {
    setTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    );
  }

  const tiersJson = JSON.stringify(
    tiers.map((t) => ({
      from: Number(t.from) || 0,
      to: t.to === null || t.to === undefined ? null : Number(t.to),
      mult: Number(t.mult) || 1,
      note: t.note,
    })),
  );

  // Success indicator (edit mode) — fired when action returns {} (no error).
  const justSaved =
    mode === "edit" && state && Object.keys(state).length === 0 && state !== EMPTY;

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
      {justSaved && (
        <p className="flex items-center gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-rise">
          <CheckCircle2 className="h-4 w-4" />
          Rule saved.
        </p>
      )}

      <FormSection title="Identity">
        <Field
          label="Rule name"
          htmlFor="rule_name"
          required
          error={fe.rule_name}
          wide
          hint="Short, descriptive. e.g. 'Engineering — 1.5× weekdays / 2× weekends'"
        >
          <TextInput
            id="rule_name"
            name="rule_name"
            defaultValue={initial?.ruleName}
            invalid={Boolean(fe.rule_name)}
          />
        </Field>
        <Field label="Active" htmlFor="is_active" hint="Inactive rules are ignored by the resolver.">
          <label className="inline-flex h-10 items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              defaultChecked={initial?.isActive ?? true}
              className="h-4 w-4 accent-ink-800"
            />
            <span className="text-sm text-ash-700">Active</span>
          </label>
        </Field>
        <Field label="Description" htmlFor="description" wide>
          <TextArea
            id="description"
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
          />
        </Field>
      </FormSection>

      <FormSection title="Validity (effective dating)">
        <Field
          label="Valid from"
          htmlFor="valid_from"
          required
          error={fe.valid_from}
          hint="Resolver picks this rule only for attendance dates inside the window."
        >
          <TextInput
            id="valid_from"
            name="valid_from"
            type="date"
            defaultValue={initial?.validFrom ?? "2026-01-01"}
            invalid={Boolean(fe.valid_from)}
          />
        </Field>
        <Field
          label="Valid to"
          htmlFor="valid_to"
          error={fe.valid_to}
          hint="Leave blank for an open-ended rule."
        >
          <TextInput
            id="valid_to"
            name="valid_to"
            type="date"
            defaultValue={initial?.validTo ?? ""}
            invalid={Boolean(fe.valid_to)}
          />
        </Field>
      </FormSection>

      <FormSection title="Threshold">
        <Field
          label="Threshold type"
          htmlFor="threshold_type"
          required
        >
          <SelectInput
            id="threshold_type"
            name="threshold_type"
            options={THRESHOLD_TYPES as unknown as string[]}
            defaultValue={initial?.thresholdType ?? "Daily Hours"}
          />
        </Field>
        <Field
          label="Threshold value"
          htmlFor="threshold_value"
          required
          error={fe.threshold_value}
          hint="Hours for Daily / Weekly / Shift Based, days for Consecutive."
        >
          <TextInput
            id="threshold_value"
            name="threshold_value"
            type="number"
            step="0.25"
            min="0"
            defaultValue={initial?.thresholdValue?.toString() ?? "8"}
            invalid={Boolean(fe.threshold_value)}
          />
        </Field>
        <Field
          label="Grace (minutes)"
          htmlFor="grace_minutes"
          hint="Ignore the first N minutes past the threshold."
        >
          <TextInput
            id="grace_minutes"
            name="grace_minutes"
            type="number"
            min="0"
            defaultValue={initial?.graceMinutes?.toString() ?? "0"}
          />
        </Field>
        <Field
          label="Applies on"
          htmlFor="day_type"
          hint="Narrow the rule to a specific day class — overrides the per-day modifiers below."
        >
          <SelectInput
            id="day_type"
            name="day_type"
            options={DAY_TYPES as unknown as string[]}
            defaultValue={initial?.dayType ?? "All Days"}
          />
        </Field>
      </FormSection>

      <FormSection title="Calculation">
        <Field label="Method" htmlFor="calculation_method" required>
          <select
            id="calculation_method"
            name="calculation_method"
            value={method}
            onChange={(e) => setMethod(e.target.value as CalculationMethod)}
            className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        {method === "Multiplier" && (
          <Field
            label="Hourly multiplier"
            htmlFor="multiplier_rate"
            hint="Hourly rate × this factor for all overtime minutes."
          >
            <TextInput
              id="multiplier_rate"
              name="multiplier_rate"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initial?.multiplierRate?.toString() ?? "1.5"}
            />
          </Field>
        )}
        {method === "Fixed Amount" && (
          <Field
            label="Fixed amount per hour"
            htmlFor="fixed_amount"
            hint="Flat per-hour amount, used instead of hourly rate × multiplier."
          >
            <TextInput
              id="fixed_amount"
              name="fixed_amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.fixedAmount?.toString() ?? "0"}
            />
          </Field>
        )}
      </FormSection>

      {method === "Tiered" && (
        <FormSection title="Tier ladder">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <p className="text-xs text-ash-600">
              Define the multiplier per overtime minute band. Each row covers
              [from, to). Leave the last row's "to" blank for an open-ended tier.
            </p>
            <input type="hidden" name="tiered_rates" value={tiersJson} />
            <ul className="flex flex-col gap-2">
              {tiers.length === 0 && (
                <li className="rounded-card border border-dashed border-hairline bg-canvas/40 px-3 py-4 text-center text-xs text-ash-500">
                  No tiers yet. Click "Add tier" below.
                </li>
              )}
              {tiers.map((t, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-1 items-end gap-2 rounded-card border border-hairline bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]"
                >
                  <NumberCell
                    label="From (min)"
                    value={t.from}
                    onChange={(n) => patchTier(idx, { from: n ?? 0 })}
                  />
                  <NumberCell
                    label="To (min, blank = open)"
                    value={t.to}
                    onChange={(n) => patchTier(idx, { to: n })}
                    allowNull
                  />
                  <NumberCell
                    label="Multiplier"
                    step={0.1}
                    value={t.mult}
                    onChange={(n) => patchTier(idx, { mult: n ?? 1 })}
                  />
                  <label className="flex flex-col gap-1 text-xs text-ash-600">
                    Note
                    <input
                      type="text"
                      value={t.note}
                      onChange={(e) => patchTier(idx, { note: e.target.value })}
                      className="h-9 rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    className="inline-flex h-9 items-center gap-1 rounded-chip border border-fall/40 px-2 text-xs font-medium text-fall hover:bg-fall/5 focus-ring"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addTier}
              className="inline-flex h-9 w-fit items-center gap-1 rounded-chip border border-hairline px-3 text-xs font-medium text-ink-800 hover:bg-canvas focus-ring"
            >
              <Plus className="h-3 w-3" />
              Add tier
            </button>
          </div>
        </FormSection>
      )}

      <FormSection title="Day-type modifiers">
        <Field
          label="Weekend multiplier"
          htmlFor="weekend_multiplier"
          hint="Stacks on top of the base calculation when Sat/Sun. Set to 1.0 to disable."
        >
          <TextInput
            id="weekend_multiplier"
            name="weekend_multiplier"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initial?.weekendMultiplier?.toString() ?? "1"}
          />
        </Field>
        <Field
          label="Public-holiday multiplier"
          htmlFor="holiday_multiplier"
          hint="Stacks on the base when the date is in the company Holiday List. Holiday > weekend if both apply."
        >
          <TextInput
            id="holiday_multiplier"
            name="holiday_multiplier"
            type="number"
            step="0.1"
            min="0"
            defaultValue={initial?.holidayMultiplier?.toString() ?? "2"}
          />
        </Field>
      </FormSection>

      <FormSection title="Notes (internal)">
        <Field label="Notes" htmlFor="notes" wide>
          <TextArea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
          />
        </Field>
      </FormSection>

      <SubmitRow cancelHref={cancelHref} mode={mode} />
    </form>
  );
}

function NumberCell({
  label,
  value,
  onChange,
  step = 1,
  allowNull = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  step?: number;
  allowNull?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ash-600">
      {label}
      <input
        type="number"
        step={step}
        value={value === null ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(allowNull ? null : 0);
          } else {
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : 0);
          }
        }}
        className="h-9 rounded-xl border border-hairline bg-surface px-3 text-sm focus-ring"
      />
    </label>
  );
}

function SubmitRow({
  cancelHref,
  mode,
}: {
  cancelHref: string;
  mode: "create" | "edit";
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
      <Link
        href={cancelHref as Route}
        className="inline-flex h-10 items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
      >
        Cancel
      </Link>
      <Submit mode={mode} />
    </div>
  );
}

function Submit({ mode }: { mode: "create" | "edit" }) {
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
      {pending
        ? mode === "create"
          ? "Creating…"
          : "Saving…"
        : mode === "create"
          ? "Create rule"
          : "Save changes"}
    </button>
  );
}
