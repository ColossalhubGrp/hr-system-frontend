import { cn } from "@/lib/cn";

/**
 * Generic status pill that picks a tone from the status string. Used wherever
 * a doctype has a Select field for status — Expense Claim, Appraisal, Loan,
 * Training Result, etc. Each module overrides the tone map for unusual values
 * by passing `tones`; falls back to common buckets otherwise.
 */
const DEFAULT_TONES: Record<string, string> = {
  // positive
  Active: "bg-rise/10 text-rise ring-rise/20",
  Approved: "bg-rise/10 text-rise ring-rise/20",
  Paid: "bg-rise/10 text-rise ring-rise/20",
  Submitted: "bg-rise/10 text-rise ring-rise/20",
  Completed: "bg-rise/10 text-rise ring-rise/20",
  Disbursed: "bg-rise/10 text-rise ring-rise/20",

  // pending / draft
  Open: "bg-amber-100 text-amber-800 ring-amber-200",
  Draft: "bg-amber-100 text-amber-800 ring-amber-200",
  Pending: "bg-amber-100 text-amber-800 ring-amber-200",
  Unpaid: "bg-amber-100 text-amber-800 ring-amber-200",
  "On Hold": "bg-amber-100 text-amber-800 ring-amber-200",
  Sanctioned: "bg-amber-100 text-amber-800 ring-amber-200",
  Scheduled: "bg-amber-100 text-amber-800 ring-amber-200",

  // negative
  Rejected: "bg-fall/10 text-fall ring-fall/20",
  Cancelled: "bg-ash-100 text-ash-700 ring-ash-200",
  Closed: "bg-ash-100 text-ash-700 ring-ash-200",
  Inactive: "bg-ash-100 text-ash-700 ring-ash-200",
};

export function StatusPill({
  status,
  tones,
}: {
  status: string;
  tones?: Record<string, string>;
}) {
  const tone =
    (tones && tones[status]) ?? DEFAULT_TONES[status] ?? DEFAULT_TONES.Inactive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tone,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
