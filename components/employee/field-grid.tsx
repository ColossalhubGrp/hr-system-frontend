import { cn } from "@/lib/cn";

type Field = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  wide?: boolean;
};

/**
 * Two-column key/value grid used inside every employee tab. Wide fields
 * (addresses, bios) span the full row. Empty values render as a dim em-dash so
 * "not set" reads visibly different from "loading".
 */
export function FieldGrid({
  fields,
  className,
}: {
  fields: Field[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2",
        className,
      )}
    >
      {fields.map((f, i) => (
        <div
          key={`${f.label}-${i}`}
          className={cn("flex flex-col gap-1", f.wide && "sm:col-span-2")}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-ash-500">
            {f.label}
          </dt>
          <dd className="text-sm text-ash-900">
            {isEmpty(f.value) ? <span className="text-ash-400">—</span> : f.value}
          </dd>
          {f.hint && <p className="text-xs text-ash-500">{f.hint}</p>}
        </div>
      ))}
    </dl>
  );
}

function isEmpty(v: React.ReactNode): boolean {
  return v === null || v === undefined || v === "" || v === false;
}
