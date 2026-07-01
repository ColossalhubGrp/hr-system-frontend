"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  seedGradesFromSystem,
  fetchGradeShells,
} from "@/app/(workspace)/payroll/setup/actions";

export interface GradingSystemOption {
  name: string;             // === system_name
  region?: string | null;
  common_users?: string | null;
}

interface Shell { code: string; name: string; }

/**
 * Empty-state picker for `/payroll/setup/pay-grades`.
 *
 *   1. Pick a grading system from the dropdown.
 *   2. Pick the NEC ceiling grade (or "all NEC" / "none NEC").
 *   3. Click "Load grades" — if the tenant already has grades, a
 *      themed confirm modal warns that they'll be replaced. Confirm
 *      → server wipes + re-seeds, marking is_nec_grade per ordinal.
 *
 * Also renders as a compact "Load from another system" trigger when
 * the table already has rows (`variant="inline"`).
 */
export function GradingSystemChooser({
  systems,
  variant = "hero",
  currentSystem = null,
  existingGradeCount = 0,
}: {
  systems: GradingSystemOption[];
  variant?: "hero" | "inline";
  currentSystem?: string | null;
  existingGradeCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [choice, setChoice] = useState<string>(systems[0]?.name ?? "");
  const [ceiling, setCeiling] = useState<string>("ALL");
  const [shells, setShells] = useState<Shell[]>([]);
  const [loadingShells, setLoadingShells] = useState(false);
  const [pending, startTransition] = useTransition();

  const detail = useMemo(
    () => systems.find((s) => s.name === choice),
    [systems, choice],
  );

  // When the system changes, refresh the ladder so the ceiling
  // dropdown reflects that system's grades.
  useEffect(() => {
    if (!choice) {
      setShells([]);
      return;
    }
    let cancelled = false;
    setLoadingShells(true);
    fetchGradeShells(choice)
      .then((rows) => {
        if (cancelled) return;
        setShells(rows);
        // If the current ceiling code doesn't exist in the new
        // system's ladder, reset to "ALL".
        if (ceiling !== "ALL" && ceiling !== "NONE"
            && !rows.some((r) => r.code === ceiling)) {
          setCeiling("ALL");
        }
      })
      .catch(() => setShells([]))
      .finally(() => {
        if (!cancelled) setLoadingShells(false);
      });
    return () => { cancelled = true; };
    // ceiling intentionally excluded — we only re-fetch on system change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  function requestSubmit() {
    if (!choice) {
      toast.error("Pick a grading system first.");
      return;
    }
    if (choice === currentSystem) {
      toast.error(`${choice} is already the active grading system.`);
      return;
    }
    if (existingGradeCount > 0) {
      setConfirming(true);
      return;
    }
    doSubmit();
  }

  function doSubmit() {
    setConfirming(false);
    startTransition(async () => {
      try {
        const r = await seedGradesFromSystem(choice, ceiling);
        if (r.no_template) {
          toast.success(
            `${choice} doesn't have a preset ladder — add grades manually with + Add grade.`,
          );
        } else {
          const ceilingLabel =
            ceiling === "ALL" ? "all grades inside NEC"
            : ceiling === "NONE" ? "no grades inside NEC"
            : `NEC ceiling ${ceiling}`;
          const parts = [
            `Loaded ${r.inserted} ${choice} grade${r.inserted === 1 ? "" : "s"}`,
          ];
          if ((r.replaced ?? 0) > 0) parts.push(`replaced ${r.replaced}`);
          parts.push(ceilingLabel);
          toast.success(parts.join(" · ") + ".");
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(
          (err as { message?: string })?.message ??
            "Couldn't load that grading system.",
        );
      }
    });
  }

  if (variant === "inline" && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-primary hover:underline"
      >
        Select Grading System →
      </button>
    );
  }

  const body = (
    <div className="flex flex-col gap-3">
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          Grading system
        </span>
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {systems.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {detail && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Region:</span>{" "}
            {detail.region || "—"}
          </div>
          <div>
            <span className="font-semibold text-foreground">Typical users:</span>{" "}
            {detail.common_users || "—"}
          </div>
        </div>
      )}

      <label className="text-sm">
        <span className="mb-1 block font-semibold text-foreground">
          NEC ceiling grade
        </span>
        <select
          value={ceiling}
          onChange={(e) => setCeiling(e.target.value)}
          disabled={loadingShells}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-60"
        >
          <option value="ALL">All grades are inside NEC</option>
          <option value="NONE">No grades are inside NEC (all editable)</option>
          <optgroup label="Ceiling grade (NEC ends here)">
            {shells.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Grades at or below this level use the grade&apos;s salary and are
          read-only per employee. Grades above are editable per employee.
        </p>
      </label>

      <p className="text-xs text-muted-foreground">
        We&apos;ll insert one grade per level. Salaries start at 0 —
        you edit them per grade.
      </p>
    </div>
  );

  const confirmModal = confirming && (
    <ConfirmReplaceModal
      pending={pending}
      newSystem={choice}
      currentSystem={currentSystem}
      existingGradeCount={existingGradeCount}
      onCancel={() => setConfirming(false)}
      onConfirm={doSubmit}
    />
  );

  if (variant === "inline") {
    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (!pending && !confirming && e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Load from a grading system
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {body}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestSubmit}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {pending ? "Loading…" : "Load grades"}
              </button>
            </div>
          </div>
        </div>
        {confirmModal}
      </>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border bg-card p-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Which grading system do you use?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a framework and we&apos;ll seed its grade ladder for you.
            If your organisation uses an internal ladder, choose{" "}
            <span className="font-semibold text-foreground">
              Custom Grade/Band Systems
            </span>{" "}
            and add grades manually.
          </p>
        </div>
        {body}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={requestSubmit}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Loading…" : "Load grades"}
          </button>
        </div>
      </div>
      {confirmModal}
    </>
  );
}

function ConfirmReplaceModal({
  pending,
  newSystem,
  currentSystem,
  existingGradeCount,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  newSystem: string;
  currentSystem: string | null;
  existingGradeCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const noun = existingGradeCount === 1 ? "grade" : "grades";
  const currentLabel = currentSystem
    ? `${existingGradeCount} ${currentSystem} ${noun}`
    : `${existingGradeCount} existing ${noun}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (!pending && e.target === e.currentTarget) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="grade-replace-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b bg-rose-50 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="grade-replace-title" className="text-base font-bold text-rose-900">
              Replace {currentLabel}?
            </h2>
            <p className="mt-0.5 text-xs text-rose-800/80">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5 text-sm text-foreground/90">
          <p>
            Loading{" "}
            <span className="font-semibold text-foreground">{newSystem}</span>{" "}
            will:
          </p>
          <ul className="space-y-1.5 pl-1">
            <Row>Delete <strong>{currentLabel}</strong> from the pay-grade catalogue.</Row>
            <Row>Clear <strong>Pay grade</strong> on any employee that was assigned one of them.</Row>
            <Row>Seed the {newSystem} grade ladder fresh with salaries at 0 for you to fill in.</Row>
          </ul>
          <p className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            If any grades already have salaries filled in, those values will be lost.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? "Replacing…" : `Replace with ${newSystem}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
      <span>{children}</span>
    </li>
  );
}
