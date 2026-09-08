"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CycleTemplateSaveState } from "@/app/(workspace)/hr/performance/actions";

type Action = (
  prev: CycleTemplateSaveState,
  form: FormData,
) => Promise<CycleTemplateSaveState>;
const EMPTY: CycleTemplateSaveState = {};

/**
 * Inline editor for an Appraisal Cycle's Appraisal Template. Read-mode shows
 * the current template with a "Change" button; edit-mode swaps in a picker.
 * The bound server action re-validates the cycle detail page on success.
 */
export function CycleTemplateEditor({
  action,
  current,
  templates,
}: {
  action: Action;
  current: string | null;
  templates: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, dispatch] = useFormState(action, EMPTY);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {current ? (
          <span className="rounded-chip bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-800">
            {current}
          </span>
        ) : (
          <span className="text-sm text-ash-500">
            No template — appraisals fall back to per-feedback criteria.
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-7 items-center gap-1 rounded-chip border border-hairline px-2 text-xs text-ash-600 transition hover:bg-canvas hover:text-ash-800 focus-ring"
        >
          <Pencil className="h-3 w-3" />
          Change
        </button>
        {templates.length === 0 && (
          <Link
            href={"/settings/appraisal-templates/new" as Route}
            className="text-xs text-ink-700 underline underline-offset-2 hover:text-ink-900"
          >
            Create a template
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-fall/30 bg-fall/[0.06] px-2 py-1.5 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      <select
        name="appraisal_template"
        defaultValue={current ?? ""}
        className="h-9 w-full max-w-sm rounded-chip border border-hairline bg-surface px-3 text-sm text-ink-900 focus-ring"
      >
        <option value="">— none (clear) —</option>
        {templates.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <p className="text-xs text-ash-500">
        Rating criteria + weightages new appraisals under this cycle will
        inherit. Existing appraisals aren&apos;t rewritten.
      </p>

      <div className="flex items-center gap-2">
        <SaveBtn />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex h-8 items-center gap-1 rounded-chip px-3 text-xs text-ash-700 transition hover:bg-canvas focus-ring"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-chip bg-ink-800 px-3 text-xs font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          Save
        </>
      )}
    </button>
  );
}
