import { cn } from "@/lib/cn";

const STEPS = [
  { key: "OPEN", label: "Open" },
  { key: "PROCESSED", label: "Processed" },
  { key: "UPDATED", label: "Updated" },
] as const;

/**
 * Three-step horizontal indicator for a Payroll Run's status:
 *   Open → Processed → Updated
 * Completed steps go green; the active step is brand-coloured.
 */
export function FlowSteps({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs font-semibold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-0.5 w-12",
                  i < idx ? "bg-emerald-500" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
