"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ClockInState } from "@/app/(workspace)/me/clock/actions";

type Action = (prev: ClockInState, form: FormData) => Promise<ClockInState>;
const EMPTY: ClockInState = {};

/**
 * Compact inline clock-in/out for the /me dashboard tile. Captures
 * geolocation in the background and submits in one tap. When the user is
 * geofence-exempt we skip location entirely — they get the button
 * immediately. Surfaces errors and successes in line, no navigation.
 */
export function InlineClock({
  action,
  geofenceExempt,
  defaultShift,
  initialState,
}: {
  action: Action;
  geofenceExempt: boolean;
  defaultShift: string | null;
  initialState: "in" | "out" | "none";
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [geoState, setGeoState] = useState<
    "idle" | "requesting" | "ok" | "denied" | "unsupported"
  >("idle");

  // Optimistic direction: if the action just recorded an IN, the next click
  // should read as Clock out; otherwise mirror the server-rendered initial
  // state.
  const lastFromServer = state.logType ?? null;
  const direction: "IN" | "OUT" = lastFromServer
    ? lastFromServer === "IN"
      ? "OUT"
      : "IN"
    : initialState === "in"
      ? "OUT"
      : "IN";

  useEffect(() => {
    if (geofenceExempt) {
      setGeoState("ok");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, [geofenceExempt]);

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="log_type" value={direction} />
      {coords && (
        <>
          <input type="hidden" name="latitude" value={coords.lat} />
          <input type="hidden" name="longitude" value={coords.lng} />
        </>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Submit
          direction={direction}
          ready={geofenceExempt || geoState === "ok"}
        />
        <SideInfo
          geofenceExempt={geofenceExempt}
          geoState={geoState}
          coords={coords}
          direction={direction}
          defaultShift={defaultShift}
          serverResult={state}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-fall/30 bg-fall/[0.06] px-3 py-2 text-xs text-fall"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          {state.error}
        </p>
      )}

      {state.createdId && !state.error && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-rise/30 bg-rise/[0.06] px-3 py-2 text-xs text-rise"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Clocked {state.logType === "IN" ? "in" : "out"}.{" "}
          {state.geofenceReason === "exempt"
            ? "Geofence skipped (exempt)."
            : state.geofenceReason === "no-locations"
              ? "No location restriction on your shift."
              : "You're within an allowed location."}
        </p>
      )}
    </form>
  );
}

function SideInfo({
  geofenceExempt,
  geoState,
  coords,
  direction,
  defaultShift,
  serverResult,
}: {
  geofenceExempt: boolean;
  geoState: "idle" | "requesting" | "ok" | "denied" | "unsupported";
  coords: { lat: number; lng: number; accuracy: number } | null;
  direction: "IN" | "OUT";
  defaultShift: string | null;
  serverResult: ClockInState;
}) {
  // After a success, the side panel narrates what just happened.
  if (serverResult.createdId) {
    return (
      <p className="text-xs text-ash-700">
        Tap again to clock {direction === "IN" ? "in" : "out"}.
        {defaultShift && (
          <span className="block text-[11px] text-ash-500">
            Shift: {defaultShift}
          </span>
        )}
      </p>
    );
  }

  if (geofenceExempt) {
    return (
      <p className="text-xs text-ash-700">
        <span className="inline-flex items-center gap-1 text-rise">
          <ShieldCheck className="h-3.5 w-3.5" />
          Geofence exempt
        </span>
        {defaultShift && (
          <span className="block text-[11px] text-ash-500">
            Shift: {defaultShift}
          </span>
        )}
      </p>
    );
  }
  if (geoState === "requesting") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-ash-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Locating you…
      </p>
    );
  }
  if (geoState === "ok" && coords) {
    return (
      <p className="text-xs text-ash-700">
        <span className="inline-flex items-center gap-1">
          <Crosshair className="h-3.5 w-3.5 text-ink-700" />
          Located (±{Math.round(coords.accuracy)} m)
        </span>
        {defaultShift && (
          <span className="block text-[11px] text-ash-500">
            Shift: {defaultShift}
          </span>
        )}
      </p>
    );
  }
  if (geoState === "denied") {
    return (
      <p className="text-xs text-fall">
        Location permission denied. Open the full clock-in page to retry.
      </p>
    );
  }
  if (geoState === "unsupported") {
    return (
      <p className="text-xs text-fall">
        Your browser can't share location.
      </p>
    );
  }
  return null;
}

function Submit({
  direction,
  ready,
}: {
  direction: "IN" | "OUT";
  ready: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || !ready;
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-chip px-6 text-sm font-semibold transition focus-ring",
        direction === "IN"
          ? "bg-ink-800 text-white hover:bg-ink-700"
          : "bg-fall text-white hover:bg-fall/90",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      {pending
        ? "Recording…"
        : direction === "IN"
          ? "Clock in"
          : "Clock out"}
    </button>
  );
}
