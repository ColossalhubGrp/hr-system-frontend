"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StdFormState } from "@/lib/frappe/form-errors";

type Action = (prev: StdFormState, form: FormData) => Promise<StdFormState>;
const EMPTY: StdFormState = {};

export function DesignationEditor({
  mode,
  action,
  initial,
  skillsPool,
  cancelHref = "/settings/designations",
}: {
  mode: "new" | "edit";
  action: Action;
  initial?: {
    name: string;
    description: string | null;
    skills: string[];
  };
  /** Existing Skill masters — populates the "New skill" datalist. New
   *  skills typed here are auto-created on save. */
  skillsPool: string[];
  cancelHref?: string;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const fe = state.fieldErrors ?? {};

  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setNewSkill("");
      return;
    }
    setSkills((prev) => [...prev, s]);
    setNewSkill("");
  };

  const removeSkill = (s: string) => {
    setSkills((prev) => prev.filter((x) => x !== s));
  };

  const skillsJson = useMemo(() => JSON.stringify(skills), [skills]);

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

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ash-500">
          Designation
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ash-600">
              Name<span className="ml-0.5 text-fall">*</span>
            </span>
            <input
              type="text"
              name="name"
              defaultValue={initial?.name}
              readOnly={mode === "edit"}
              placeholder="e.g. Software Engineer"
              className={cn(
                "h-10 rounded-md border bg-white px-2 text-sm focus-ring",
                fe.name ? "border-fall" : "border-hairline",
                mode === "edit" && "cursor-not-allowed bg-canvas/50 text-ash-600",
              )}
            />
            {fe.name && <span className="text-xs text-fall">{fe.name}</span>}
            {mode === "edit" && (
              <span className="text-xs text-ash-500">
                Rename by cloning into a new one — employees link by name.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs font-medium text-ash-600">Description</span>
            <textarea
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={2}
              placeholder="Short summary of the role, its scope, what it's accountable for."
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ash-500">
            Required skills
          </h2>
          <p className="mt-1 text-xs text-ash-500">
            Competencies expected for anyone in this role. Fed into the
            Employee Skill Map on appraisals + used to score interview
            candidates against the job.
          </p>
        </div>

        {skills.length === 0 ? (
          <p className="mb-4 rounded-card border border-dashed border-hairline bg-canvas/40 px-4 py-6 text-center text-sm text-ash-500">
            No skills yet. Pick from the pool below or type a new one.
          </p>
        ) : (
          <ul className="mb-4 flex flex-wrap gap-2">
            {skills.map((s) => (
              <li
                key={s}
                className="inline-flex items-center gap-1.5 rounded-chip border border-hairline bg-canvas/60 py-1 pl-3 pr-1 text-sm text-ink-800"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  title={`Remove ${s}`}
                  className="rounded-md p-1 text-ash-500 transition hover:bg-fall/10 hover:text-fall focus-ring"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add-skill surface */}
        <div className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-hairline bg-canvas/30 p-3">
          <div className="flex flex-1 min-w-[220px] flex-col gap-1">
            <label className="text-xs font-medium text-ash-600" htmlFor="new-skill">
              New skill
            </label>
            <input
              id="new-skill"
              type="text"
              list="skills-pool"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder={
                skillsPool.length > 0
                  ? "Pick from the pool or type a new one"
                  : "e.g. Python, Public speaking, Financial modelling"
              }
              className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus-ring"
            />
            <datalist id="skills-pool">
              {skillsPool
                .filter((n) => !skills.some((s) => s.toLowerCase() === n.toLowerCase()))
                .map((n) => (
                  <option key={n} value={n} />
                ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={addSkill}
            disabled={!newSkill.trim()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-chip border border-hairline px-3 text-xs font-semibold text-ash-700 transition focus-ring",
              "hover:border-ink-400 hover:text-ink-800",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </section>

      {/* Hidden field the server action reads. */}
      <input type="hidden" name="skills_json" value={skillsJson} />

      <div className="-mx-1 mt-2 flex items-center justify-end gap-2 rounded-card border border-hairline bg-surface/95 p-3 shadow-rail backdrop-blur">
        <Link
          href={cancelHref as Route}
          className="h-10 inline-flex items-center justify-center rounded-chip px-4 text-sm font-medium text-ash-700 transition hover:bg-canvas focus-ring"
        >
          Cancel
        </Link>
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
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save designation
        </>
      )}
    </button>
  );
}
