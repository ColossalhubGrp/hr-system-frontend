"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

/** Field descriptor for one column of a child-table row. */
export type ChildFieldSpec<Row> = {
  key: keyof Row & string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: string[];         // for type=select
  placeholder?: string;
  wide?: boolean;             // spans two columns
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

type Props<Row extends Record<string, unknown>> = {
  /** Hidden input name — the form action reads this key and JSON-parses. */
  name: string;
  fields: ChildFieldSpec<Row>[];
  initial: Row[];
  emptyRow: () => Row;
  addLabel?: string;
  emptyLabel?: string;
  /** Serialize a row before submission — drop empty strings so the backend
   *  doesn't reject required fields with a value of "". Default: identity. */
  serialize?: (row: Row) => Record<string, unknown>;
};

/**
 * Client-side editor for a child table. Rows live in local state, and every
 * change re-serializes the full list into a hidden `<input name={name}>` so
 * the enclosing form posts it alongside all the scalar fields.
 *
 * Kept deliberately generic — one editor drives Education, Work Experience,
 * and Skills without a bespoke component each. Add-row appends `emptyRow()`;
 * remove-row splices in place.
 */
export function ChildTableEditor<Row extends Record<string, unknown>>({
  name,
  fields,
  initial,
  emptyRow,
  addLabel = "Add row",
  emptyLabel = "No rows yet.",
  serialize,
}: Props<Row>) {
  const [rows, setRows] = useState<Row[]>(initial);

  const update = (i: number, key: keyof Row, value: unknown) => {
    setRows((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };
  const removeAt = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };
  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const serializedRows = rows.map((r) => (serialize ? serialize(r) : r));

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-4 py-6 text-sm text-ash-600">
          {emptyLabel}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-3 rounded-card border border-hairline bg-white p-3 sm:grid-cols-2 md:grid-cols-3"
            >
              {fields.map((f) => (
                <label
                  key={f.key}
                  className={`flex flex-col gap-1 text-sm ${f.wide ? "sm:col-span-2 md:col-span-3" : ""}`}
                >
                  <span className="text-xs font-medium text-ash-600">
                    {f.label}
                    {f.required && <span className="ml-0.5 text-fall">*</span>}
                  </span>
                  {f.type === "select" ? (
                    <select
                      value={String(row[f.key] ?? "")}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "number" ? (
                    <input
                      type="number"
                      value={row[f.key] == null ? "" : String(row[f.key])}
                      onChange={(e) => {
                        const v = e.target.value;
                        update(i, f.key, v === "" ? null : Number(v));
                      }}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      placeholder={f.placeholder}
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  ) : f.type === "date" ? (
                    <input
                      type="date"
                      value={String(row[f.key] ?? "")}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(row[f.key] ?? "")}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
                    />
                  )}
                </label>
              ))}
              <div className="flex items-end justify-end sm:col-span-2 md:col-span-3">
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="inline-flex items-center gap-1.5 rounded-chip border border-hairline px-3 py-1.5 text-xs text-ash-600 transition hover:border-fall/60 hover:text-fall focus-ring"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex w-fit items-center gap-1.5 rounded-chip border border-hairline bg-white px-3 py-1.5 text-sm text-ash-700 transition hover:border-ink-400 hover:text-ink-800 focus-ring"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>

      {/* Hidden field the server action reads. Re-serialized on every render
          because rows come from state and updates are synchronous. */}
      <input type="hidden" name={name} value={JSON.stringify(serializedRows)} />
    </div>
  );
}
