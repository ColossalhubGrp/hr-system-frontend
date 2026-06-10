import { cn } from "@/lib/cn";

const TONES: Record<string, string> = {
  Open: "bg-amber-100 text-amber-800 ring-amber-200",
  Approved: "bg-rise/10 text-rise ring-rise/20",
  Rejected: "bg-fall/10 text-fall ring-fall/20",
  Cancelled: "bg-ash-100 text-ash-700 ring-ash-200",
};

export function LeaveStatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? TONES.Cancelled;
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
