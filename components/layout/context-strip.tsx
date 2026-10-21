import Link from "next/link";
import type { Route } from "next";
import { Building2, Undo2 } from "lucide-react";

/**
 * Narrow banner under the Topbar that always answers "which tenant /
 * company am I operating inside right now?" at a glance. Lifted from
 * the FCGS OneERP reference where the equivalent strip reads
 * "Working in DEMO Primary School · Directory · Return to global".
 *
 * `companyName` is the company the signed-in user is scoped to (their
 * default_company or the one they picked via the company switcher).
 * When unknown we quietly collapse to a neutral "Workspace" so the
 * strip never shows an awkward blank.
 */
export function ContextStrip({
  companyName,
  directoryHref = "/employee",
  returnToGlobalHref,
}: {
  companyName?: string | null;
  directoryHref?: string;
  returnToGlobalHref?: string;
}) {
  const label = companyName?.trim() || "Workspace";
  return (
    <div className="flex items-center gap-3 border-b border-hairline bg-ink-800 px-6 py-2 text-[12.5px] text-white/85">
      <Building2 className="h-3.5 w-3.5 text-white/60" />
      <span className="truncate">
        Working in <strong className="font-semibold text-white">{label}</strong>
      </span>
      <div className="ml-auto flex items-center gap-4">
        <Link
          href={directoryHref as Route}
          className="font-medium text-white/85 underline-offset-2 hover:text-white hover:underline"
        >
          Directory
        </Link>
        {returnToGlobalHref && (
          <Link
            href={returnToGlobalHref as Route}
            className="inline-flex items-center gap-1.5 rounded-chip bg-white/10 px-3 py-1 font-medium text-white hover:bg-white/15"
          >
            <Undo2 className="h-3 w-3" />
            Return to global
          </Link>
        )}
      </div>
    </div>
  );
}
