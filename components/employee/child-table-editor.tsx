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

  const renderCell = (row: Row, i: number, f: ChildFieldSpec<Row>) => {
    if (f.type === "select") {
      return (
        <select
          aria-label={f.label}
          value={String(row[f.key] ?? "")}
          onChange={(e) => update(i, f.key, e.target.value)}
          className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
        >
          <option value="">—</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "number") {
      return (
        <input
          aria-label={f.label}
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
          className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
        />
      );
    }
    if (f.type === "date") {
      return (
        <input
          aria-label={f.label}
          type="date"
          value={String(row[f.key] ?? "")}
          onChange={(e) => update(i, f.key, e.target.value)}
          className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
        />
      );
    }
    return (
      <input
        aria-label={f.label}
        type="text"
        value={String(row[f.key] ?? "")}
        onChange={(e) => update(i, f.key, e.target.value)}
        placeholder={f.placeholder}
        className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-4 py-6 text-sm text-ash-600">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-canvas/50 text-left text-[11px] font-medium uppercase tracking-wide text-ash-500">
                {fields.map((f) => (
                  <th key={f.key} className="px-3 py-2 font-medium">
                    {f.label}
                    {f.required && <span className="ml-0.5 text-fall">*</span>}
                  </th>
                ))}
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0 align-top">
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2">
                      {renderCell(row, i, f)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label="Remove row"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-chip border border-hairline text-ash-500 transition hover:border-fall/60 hover:text-fall focus-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
