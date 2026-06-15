import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Grid3X3, TrendingUp, AlertCircle } from "lucide-react";
import {
  fetch9BoxBoard,
  listCyclesForCalibration,
  type NineBoxBoard,
} from "@/lib/frappe/calibration";
import { getMyAccess } from "@/lib/frappe/roles";
import { NineBoxGrid } from "@/components/performance/nine-box-grid";

export const metadata = { title: "Calibration · Colossal HR" };

type SP = { cycle?: string };

export default async function CalibrationPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  // Read cycles + access in parallel. We DON'T early-return on access here —
  // the parent /hr/layout already enforces HR_ANY, and the popovers themselves
  // disable when canEdit is false.
  const [cycles, access] = await Promise.all([
    listCyclesForCalibration(),
    getMyAccess(),
  ]);

  // Default to the most recently modified cycle that actually has appraisals.
  // The cycles list already returns by modified-desc — pick the first.
  const cycleId =
    searchParams.cycle ?? cycles[0]?.id ?? "";

  let board: NineBoxBoard | null = null;
  if (cycleId) {
    board = await fetch9BoxBoard(cycleId);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Grid3X3 className="h-3.5 w-3.5" />
          HR · Performance · Calibration (9-box)
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          9-box calibration
        </h1>
        <p className="text-sm text-ash-600">
          Plot every appraisal in this cycle by performance (derived from
          final score) and potential (HR set). Click any chip to recalibrate.
        </p>
      </header>

      {!access.isHrAdmin && (
        <p className="text-xs text-ash-500">
          Read-only view — only HR Director / HR Manager / IT Admin can
          recalibrate.
        </p>
      )}

      <CyclePicker
        cycles={cycles}
        selectedId={cycleId}
        currentPath="/hr/performance/calibration"
      />

      {!cycleId || !board ? (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
          {cycles.length === 0
            ? "No appraisal cycles exist yet — create one from Performance → New cycle."
            : "Pick a cycle above to view its 9-box."}
        </p>
      ) : (
        <>
          <SummaryBar board={board} />
          <NineBoxGrid board={board} canEdit={access.isHrAdmin} />
        </>
      )}
    </div>
  );
}

function SummaryBar({ board }: { board: NineBoxBoard }) {
  const cells = board.cells;
  const top = cells.find(
    (c) => c.performance === "High" && c.potential === "High",
  )?.entries.length ?? 0;
  const future = cells.find(
    (c) => c.performance === "Medium" && c.potential === "High",
  )?.entries.length ?? 0;
  const pip = cells.find(
    (c) => c.performance === "Low" && c.potential === "Low",
  )?.entries.length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile
        icon={<Grid3X3 className="h-4 w-4" />}
        label="Total appraisals"
        value={board.totalCount.toLocaleString()}
        tone="ink"
      />
      <Tile
        icon={<TrendingUp className="h-4 w-4" />}
        label="Top talent (Hi/Hi)"
        value={top.toLocaleString()}
        tone="ok"
      />
      <Tile
        icon={<TrendingUp className="h-4 w-4" />}
        label="Future stars (Med/Hi)"
        value={future.toLocaleString()}
        tone="ok"
      />
      <Tile
        icon={<AlertCircle className="h-4 w-4" />}
        label="Needs improvement"
        value={`${pip.toLocaleString()}${board.unscoredCount > 0 ? `  ·  ${board.unscoredCount} unscored` : ""}`}
        tone={pip > 0 || board.unscoredCount > 0 ? "warn" : "ok"}
      />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ink" | "ok" | "warn";
}) {
  const toneCls =
    tone === "warn"
      ? "border-amber-300/40 bg-amber-50/60 text-amber-800"
      : tone === "ok"
        ? "border-rise/30 bg-rise/[0.06] text-rise"
        : "border-hairline bg-surface text-ink-800";
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border px-4 py-3 shadow-card ${toneCls}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

function CyclePicker({
  cycles,
  selectedId,
  currentPath,
}: {
  cycles: Array<{ id: string; label: string }>;
  selectedId: string;
  currentPath: string;
}) {
  if (cycles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {cycles.slice(0, 10).map((c) => {
        const isOn = c.id === selectedId;
        const href = `${currentPath}?cycle=${encodeURIComponent(c.id)}` as Route;
        return (
          <Link
            key={c.id}
            href={href}
            className={`rounded-chip border px-3 py-1.5 text-xs font-medium transition ${
              isOn
                ? "border-ink-800 bg-ink-800 text-white"
                : "border-hairline bg-surface text-ash-700 hover:bg-canvas"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
