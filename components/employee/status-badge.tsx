import { cn } from "@/lib/cn";

const TONES: Record<string, string> = {
  Active: "bg-rise/10 text-rise ring-rise/20",
  Inactive: "bg-ash-100 text-ash-700 ring-ash-200",
  Suspended: "bg-amber-100 text-amber-700 ring-amber-200",
  Left: "bg-fall/10 text-fall ring-fall/20",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? TONES.Inactive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tone,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Active" ? "bg-rise" : status === "Left" ? "bg-fall" : "bg-current",
        )}
      />
      {status}
    </span>
  );
}
