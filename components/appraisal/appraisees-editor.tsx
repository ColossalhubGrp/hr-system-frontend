"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus, Save, Trash2, Users2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  EmployeePickerField,
  type EmployeeDirectoryEntry,
} from "@/components/common/employee-picker-field";
import {
  Field,
  FormSection,
  SelectInput,
} from "@/components/employee/form-bits";
import type { StdFormState } from "@/lib/frappe/form-errors";
import type { CreateAppraisalsResult } from "@/app/(workspace)/hr/performance/actions";

type Row = {
  employee: string;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
  appraisalTemplate: string | null;
};

const EMPTY: StdFormState = {};

export function AppraiseesEditor({
  cycleId,
  initial,
  directory,
  templates,
  saveAction,
  createAction,
}: {
  cycleId: string;
  initial: Row[];
  directory: EmployeeDirectoryEntry[];
  templates: string[];
  saveAction: (
    cycleId: string,
    prev: StdFormState,
    form: FormData,
  ) => Promise<StdFormState>;
  createAction: (cycleId: string) => Promise<CreateAppraisalsResult>;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const bound = saveAction.bind(null, cycleId);
  const [state, dispatch] = useFormState(bound, EMPTY);
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState<CreateAppraisalsResult | null>(null);
  const router = useRouter();

  const addFromPicker = (form: FormData) => {
    const empId = String(form.get("appraisee_employee") ?? "").trim();
    if (!empId) return;
    if (rows.some((r) => r.employee === empId)) return;
    const src = directory.find((d) => d.id === empId);
    setRows([
      ...rows,
      {
        employee: empId,
        employeeName: src?.employee_name ?? null,
        department: src?.department ?? null,
        designation: src?.designation ?? null,
        appraisalTemplate: null,
      },
    ]);
  };

  const runCreate = () =>
    start(async () => {
      const r = await createAction(cycleId);
      setCreating(r);
      router.refresh();
    });

  const payload = rows.map((r) => ({
    employee: r.employee,
    department: r.department ?? undefined,
    designation: r.designation ?? undefined,
    appraisal_template: r.appraisalTemplate ?? undefined,
  }));

  return (
    <div className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-card border border-fall/30 bg-fall/[0.06] px-4 py-3 text-sm text-fall"
        >
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {creating && (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-card border px-4 py-3 text-sm",
            creating.ok
              ? "border-rise/30 bg-rise/[0.06] text-rise"
              : "border-fall/30 bg-fall/[0.06] text-fall",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {creating.ok
            ? `${creating.created} appraisal${creating.created === 1 ? "" : "s"} created. ${creating.skipped} already existed. ${creating.errored} errored.`
            : creating.error}
        </p>
      )}

      <form
        action={(formData: FormData) => {
          addFromPicker(formData);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <EmployeePickerField
            name="appraisee_employee"
            label="Add employee"
            directory={directory}
            placeholder="Pick an employee"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-chip border border-hairline bg-canvas px-3 text-sm font-medium text-ash-800 hover:bg-canvas/70 focus-ring"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <form action={dispatch} className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-card border border-hairline">
          <table className="w-full text-sm">
            <thead className="bg-canvas/50 text-left text-xs font-medium uppercase tracking-wide text-ash-500">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2">Template override</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ash-500">
                    No appraisees yet. Add employees above.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.employee} className="border-t border-hairline">
                    <td className="px-3 py-2 text-ash-900">
                      <div className="font-medium">{r.employeeName ?? r.employee}</div>
                      <div className="text-xs text-ash-500">{r.employee}</div>
                    </td>
                    <td className="px-3 py-2 text-ash-800">{r.department ?? "—"}</td>
                    <td className="px-3 py-2 text-ash-800">{r.designation ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select
                        value={r.appraisalTemplate ?? ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, x) =>
                              x === i
                                ? { ...row, appraisalTemplate: e.target.value || null }
                                : row,
                            ),
                          )
                        }
                        className="h-9 w-full rounded-chip border border-hairline bg-surface px-2 text-sm"
                      >
                        <option value="">— cycle default —</option>
                        {templates.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setRows(rows.filter((_, x) => x !== i))
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-chip border border-hairline px-2 text-xs text-fall hover:bg-fall/[0.06] focus-ring"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <input type="hidden" name="appraisees_json" value={JSON.stringify(payload)} />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-hairline bg-canvas/40 p-3">
          <div className="text-xs text-ash-500">
            {rows.length} appraisee{rows.length === 1 ? "" : "s"}. Save the list, then create appraisals for them.
          </div>
          <div className="flex items-center gap-2">
            <SaveButton />
            <button
              type="button"
              onClick={runCreate}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-chip bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 focus-ring disabled:opacity-60"
            >
              <Users2 className="h-4 w-4" />
              {pending ? "Creating…" : "Create appraisals"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-chip border border-hairline bg-surface px-4 text-sm font-medium text-ash-800 transition focus-ring",
        "hover:bg-canvas disabled:opacity-60",
      )}
    >
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : "Save appraisees"}
    </button>
  );
}
