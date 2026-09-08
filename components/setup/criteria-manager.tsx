"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";

type CreateAction = (
  prev: StdFormState,
  form: FormData,
) => Promise<StdFormState>;
type DeleteAction = (
  prev: StdFormState,
  form?: FormData,
) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export type CriterionRow = { name: string; usage: number };

export function CriteriaManager({
  initialRows,
  createAction,
  deleteAction,
}: {
  initialRows: CriterionRow[];
  createAction: CreateAction;
  deleteAction: (
    name: string,
  ) => (prev: StdFormState) => Promise<StdFormState>;
}) {
  const [createState, createDispatch] = useFormState(createAction, EMPTY);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState(initialRows);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  // Keep local rows in sync with server state after a revalidate.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Clear the input after a successful create (state is a fresh {} object
  // but the ref-based dedupe means we don't clear on the initial render).
  const lastCreateState = useRef(createState);
  useEffect(() => {
    if (createState === lastCreateState.current) return;
    lastCreateState.current = createState;
    if (!createState.error && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [createState]);

  return (
    <div className="flex flex-col gap-5">
      {/* Add row */}
      <form
        action={createDispatch}
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <div className="flex flex-1 min-w-[240px] flex-col gap-1">
          <label className="text-xs font-medium text-ash-600" htmlFor="criteria">
            New criterion
          </label>
          <input
            ref={inputRef}
            id="criteria"
            name="criteria"
            type="text"
            placeholder="e.g. Communication, Ownership, Technical delivery"
            className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
          />
        </div>
        <AddBtn />
        {createState.error && (
          <p
            role="alert"
            className="flex w-full items-center gap-2 rounded-md border border-fall/30 bg-fall/[0.06] px-3 py-1.5 text-xs text-fall"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {createState.error}
          </p>
        )}
      </form>

      {/* List */}
      <section className="card overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ash-500">
            No criteria yet. Add one above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-4 py-2.5">Criterion</th>
                <th className="px-4 py-2.5 text-right">Used by</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-3 font-medium text-ink-800">{r.name}</td>
                  <td className="px-4 py-3 text-right text-ash-700">
                    {r.usage === 0 ? (
                      <span className="text-ash-400">—</span>
                    ) : (
                      `${r.usage} feedback${r.usage === 1 ? "" : "s"}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteRow
                      name={r.name}
                      action={deleteAction(r.name)}
                      disabled={r.usage > 0}
                      isDeletingHere={deletingName === r.name}
                      onDeleting={() => setDeletingName(r.name)}
                      onFinished={() => setDeletingName(null)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-chip bg-ink-800 px-3 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Add
        </>
      )}
    </button>
  );
}

function DeleteRow({
  name,
  action,
  disabled,
  isDeletingHere,
  onDeleting,
  onFinished,
}: {
  name: string;
  action: DeleteAction;
  disabled: boolean;
  isDeletingHere: boolean;
  onDeleting: () => void;
  onFinished: () => void;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);

  useEffect(() => {
    if (isDeletingHere && !state.error) onFinished();
    if (state.error) onFinished();
  }, [state, isDeletingHere, onFinished]);

  return (
    <form
      action={(fd) => {
        onDeleting();
        return dispatch(fd);
      }}
      className="inline-flex"
    >
      <button
        type="submit"
        disabled={disabled}
        title={
          disabled
            ? `${name} is still used on existing feedback — can't delete it.`
            : `Delete ${name}`
        }
        className={cn(
          "rounded-md p-1.5 text-ash-500 transition focus-ring",
          disabled
            ? "cursor-not-allowed opacity-30"
            : "hover:bg-fall/10 hover:text-fall",
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {state.error && (
        <span className="ml-2 text-xs text-fall">{state.error}</span>
      )}
    </form>
  );
}
