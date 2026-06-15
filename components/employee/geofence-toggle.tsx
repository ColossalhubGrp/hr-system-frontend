"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { GeofenceExemptState } from "@/app/(workspace)/employee/[id]/actions";

type Action = (
  prev: GeofenceExemptState,
  form: FormData,
) => Promise<GeofenceExemptState>;
const EMPTY: GeofenceExemptState = {};

/**
 * Read-only or editable toggle for `Employee.geofence_exempt`. When the
 * viewer isn't HR/Shift Admin, renders as a static status pill; otherwise
 * shows a one-tap Server Action toggle.
 */
export function GeofenceToggle({
  action,
  current,
  canEdit,
}: {
  action: Action;
  current: boolean;
  canEdit: boolean;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const exempt = state.saved !== undefined ? state.saved : current;

  if (!canEdit) {
    return (
      <div className="rounded-card border border-hairline bg-canvas p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
          Geofence policy
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900">
          {exempt ? (
            <>
              <ShieldCheck className="h-4 w-4 text-rise" />
              Exempt — check-ins allowed from any location
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-ink-700" />
              Standard — restricted to the shift's allowed locations
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form
      action={dispatch}
      className="rounded-card border border-hairline bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-semibold text-ink-900">Geofence policy</p>
      <p className="mt-1 text-xs text-ash-600">
        Set by HR or Shift Manager. When exempt, this employee can clock in
        from anywhere — useful for field, sales, or remote staff.
      </p>

      {state.error && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      {state.saved !== undefined && !state.error && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {state.saved
            ? "Geofence disabled for this employee."
            : "Geofence re-enabled."}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <ToggleButton current={exempt} target={!exempt} />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-chip px-3 py-1 text-xs font-medium",
            exempt
              ? "bg-rise/10 text-rise ring-1 ring-rise/20"
              : "bg-canvas text-ash-700 ring-1 ring-hairline",
          )}
        >
          {exempt ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              Currently exempt
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5" />
              Currently restricted
            </>
          )}
        </span>
      </div>
    </form>
  );
}

function ToggleButton({
  current,
  target,
}: {
  current: boolean;
  target: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="value"
      value={target ? "on" : ""}
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip border px-4 text-sm font-semibold transition focus-ring",
        target
          ? "border-rise/40 bg-surface text-rise hover:bg-rise/[0.06]"
          : "border-hairline bg-surface text-ash-800 hover:bg-canvas",
        pending && "opacity-60 cursor-not-allowed",
      )}
    >
      {pending
        ? "Saving…"
        : target
          ? "Mark as exempt"
          : "Re-enable geofence"}
    </button>
  );
}
