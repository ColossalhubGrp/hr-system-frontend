"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UploadState } from "@/app/(workspace)/hr/attendance/upload/actions";

type Action = (prev: UploadState, form: FormData) => Promise<UploadState>;
const EMPTY: UploadState = {};

const TEMPLATE_CSV = [
  "employee,date,status,shift",
  "HR-EMP-00001,2026-09-01,Present,Day Shift",
  "HR-EMP-00001,2026-09-02,Absent,",
  "HR-EMP-00002,2026-09-01,Work From Home,",
].join("\n");

export function UploadForm({ action }: { action: Action }) {
  const [state, dispatch] = useFormState(action, EMPTY);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
      {state.result && <ResultBanner result={state.result} />}

      <section className="card flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Template
          </h2>
          <p className="mt-1 text-sm text-ash-700">
            One row per (employee, date, status). Header row required.
            Columns: <code className="font-mono text-xs">employee</code>,
            {" "}<code className="font-mono text-xs">date</code> (YYYY-MM-DD),
            {" "}<code className="font-mono text-xs">status</code>{" "}
            (Present / Absent / On Leave / Half Day / Work From Home),
            {" "}<code className="font-mono text-xs">shift</code> (optional).
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-chip border border-hairline bg-surface px-3 text-xs font-semibold text-ash-700 transition hover:border-ink-400 hover:text-ink-800 focus-ring"
        >
          <Download className="h-3.5 w-3.5" />
          Download template
        </button>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
          Upload
        </h2>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-ash-700 file:mr-3 file:rounded-chip file:border-0 file:bg-ink-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-ink-700"
        />
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="skip_holidays"
              defaultChecked
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Skip holidays
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ash-800">
            <input
              type="checkbox"
              name="skip_on_leave"
              defaultChecked
              className="h-4 w-4 rounded border-hairline text-ink-700 focus-ring"
            />
            Skip approved leave
          </label>
        </div>
        <p className="text-xs text-ash-500">
          Max 2 MB. Days already marked are skipped so the import is safe
          to re-run after fixing bad rows.
        </p>
      </section>

      <div className="-mx-1 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <SaveBtn />
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
        "inline-flex h-10 items-center gap-2 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition focus-ring",
        "hover:bg-ink-700 disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading…
        </>
      ) : (
        <>
          <Upload className="h-4 w-4" />
          Upload + save
        </>
      )}
    </button>
  );
}

function ResultBanner({ result }: { result: UploadState["result"] }) {
  if (!result) return null;
  const { created, skipped, errored } = result.totals;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-rise/30 bg-rise/[0.06] px-4 py-3 text-sm text-ink-900">
      <p className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="h-4 w-4 text-rise" />
        Saved <strong>{created}</strong> · Skipped {skipped} · Errored{" "}
        {errored}
      </p>
      {errored > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-fall">
            {errored} row{errored === 1 ? "" : "s"} failed
          </summary>
          <ul className="mt-1 flex flex-col gap-1 text-ash-700">
            {result.errored.map((e, i) => (
              <li key={i}>
                <code className="font-mono">{e.employee || "—"}</code> · {e.date} —{" "}
                {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skipped > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-ash-600">
            {skipped} row{skipped === 1 ? "" : "s"} skipped
          </summary>
          <ul className="mt-1 flex flex-col gap-1 text-ash-600">
            {result.skipped.map((s, i) => (
              <li key={i}>
                <code className="font-mono">{s.employee}</code> · {s.date} —{" "}
                {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
