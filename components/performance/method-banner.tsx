import Link from "next/link";
import type { Route } from "next";
import { Compass, Layers3, Sparkles, Target } from "lucide-react";
import type {
  ActiveCycleInfo,
  EvaluationFramework,
} from "@/lib/frappe/appraisal-framework";

/**
 * Renders the cycle-aware framework strip at the top of every Performance
 * page. Reads framework from the live Appraisal Cycle (not from the user)
 * and offers an HR-only "Change" link to the cycle editor.
 */
export function PerformanceMethodBanner({
  cycle,
  canEdit,
}: {
  cycle: ActiveCycleInfo | null;
  canEdit: boolean;
}) {
  if (!cycle) {
    // No cycle for this company yet — only HR can do anything about it, so
    // show a softer notice without a CTA for non-HR users.
    if (!canEdit) return null;
    return (
      <div className="flex items-center gap-3 rounded-card border border-amber-200 bg-amber-50/60 p-4 shadow-card">
        <Sparkles className="h-4 w-4 text-amber-700" />
        <p className="text-sm text-ink-900">
          No active appraisal cycle for your company yet. Create one to choose
          the evaluation framework (KRA &amp; Goals / OKR / Balanced Scorecard).
        </p>
        <Link
          href={"/hr/performance/cycles/new" as Route}
          className="ml-auto inline-flex h-9 items-center rounded-chip bg-ink-800 px-4 text-xs font-semibold text-white transition hover:bg-ink-700 focus-ring"
        >
          New cycle
        </Link>
      </div>
    );
  }

  const icon = iconFor(cycle.framework);
  const editHref =
    `/hr/performance/cycles/${encodeURIComponent(cycle.cycleId)}/framework` as Route;

  return (
    <div className="flex items-center gap-3 rounded-card border border-hairline bg-canvas px-4 py-2.5 text-xs text-ash-700">
      {icon}
      <span>
        Active cycle <span className="font-medium text-ink-900">{cycle.cycleName}</span>{" "}
        evaluates against{" "}
        <span className="font-semibold text-ink-900">
          {labelFor(cycle.framework)}
        </span>
      </span>
      {canEdit && (
        <Link
          href={editHref}
          className="ml-auto text-xs font-medium text-ink-700 underline-offset-2 hover:underline focus-ring"
        >
          Change
        </Link>
      )}
    </div>
  );
}

function iconFor(f: EvaluationFramework) {
  const cls = "h-4 w-4 text-ink-700";
  if (f === "OKR") return <Target className={cls} />;
  if (f === "Balanced Scorecard") return <Compass className={cls} />;
  return <Layers3 className={cls} />;
}

function labelFor(f: EvaluationFramework): string {
  if (f === "OKR") return "OKR — Objectives & Key Results";
  if (f === "Balanced Scorecard") return "Balanced Scorecard";
  return "KRA & Goals";
}

/** Page title + subtitle for the given framework. */
export function framingForFramework(f: EvaluationFramework | null): {
  title: string;
  subtitle: string;
} {
  if (f === "OKR")
    return {
      title: "OKRs",
      subtitle:
        "Objectives & key results, peer feedback, and improvement plans.",
    };
  if (f === "Balanced Scorecard")
    return {
      title: "Balanced Scorecard",
      subtitle:
        "Strategic goals across the four perspectives, plus appraisals and feedback.",
    };
  return {
    title: "Performance",
    subtitle: "Appraisals, goals, peer feedback, and improvement plans.",
  };
}

/** Goals-tab label flips with framework, route id stays "goals". */
export function goalsTabLabel(f: EvaluationFramework | null): string {
  if (f === "OKR") return "OKRs";
  if (f === "Balanced Scorecard") return "Scorecard";
  return "Goals";
}
