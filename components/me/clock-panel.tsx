"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ClockInState } from "@/app/(workspace)/me/clock/actions";

type Action = (prev: ClockInState, form: FormData) => Promise<ClockInState>;
const EMPTY: ClockInState = {};

type LastDirection = "IN" | "OUT" | null;

type Coords = { lat: number; lng: number; accuracy: number };

/**
 * Client-side wrapper around the Server Action that owns geolocation capture.
 * The browser asks for permission once; the next intended direction (IN/OUT)
 * is decided from the last checkin server-side. The user just hits one big
 * button.
 */
export function ClockPanel({
  action,
  lastDirection,
  geofenceExempt,
  defaultShift,
}: {
  action: Action;
  lastDirection: LastDirection;
  geofenceExempt: boolean;
  defaultShift: string | null;
}) {
  const [state, dispatch] = useFormState(action, EMPTY);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoState, setGeoState] = useState<
    "idle" | "requesting" | "ok" | "denied" | "unsupported"
  >("idle");
  const [geoErr, setGeoErr] = useState<string | null>(null);

  // Determine the next intended direction. After a successful action this
  // also updates because the server-side flip moves us forward.
  const optimistic = state.logType ?? (lastDirection === "IN" ? "OUT" : "IN");

  // Auto-request location on first paint, so by the time the user clicks
  // the button we usually have a fix already.
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
      (err) => {
        setGeoState("denied");
        setGeoErr(err.message || "Permission denied");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, [geofenceExempt]);

  function recapture() {
    setGeoState("requesting");
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoState("ok");
      },
      (err) => {
        setGeoState("denied");
        setGeoErr(err.message || "Permission denied");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <input type="hidden" name="log_type" value={optimistic} />
      {coords && (
        <>
          <input type="hidden" name="latitude" value={coords.lat} />
          <input type="hidden" name="longitude" value={coords.lng} />
        </>
      )}

      {/* Status panel: result of the action OR live geolocation state */}
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-card border border-fall/30 bg-fall/[0.06] p-4 text-sm text-fall"
        >
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">Clock-in blocked</p>
            <p className="mt-1 text-xs">{state.error}</p>
          </div>
        </div>
      )}

      {state.createdId && !state.error && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-rise/30 bg-rise/[0.06] p-4 text-sm text-rise"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">
              Clocked {state.logType === "IN" ? "in" : "out"}.
            </p>
            <p className="mt-1 text-xs">
              {state.geofenceReason === "exempt"
                ? "Geofence skipped — you're set as exempt."
                : state.geofenceReason === "no-locations"
                  ? "No location restriction on your shift."
                  : "You're within an allowed location."}
            </p>
          </div>
        </div>
      )}

      {/* Geolocation status */}
      <div className="rounded-card border border-hairline bg-canvas p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ash-500">
          {geofenceExempt ? "Geofence policy" : "Your location"}
        </p>
        {geofenceExempt ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-rise">
            <ShieldCheck className="h-4 w-4" />
            Exempt — clock in from anywhere
          </p>
        ) : geoState === "requesting" ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ash-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Asking for location…
          </p>
        ) : geoState === "ok" && coords ? (
          <div className="mt-1 flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <MapPin className="h-4 w-4 text-ink-700" />
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
            <p className="text-xs text-ash-500">
              Accuracy ±{Math.round(coords.accuracy)} m
              {" · "}
              <button
                type="button"
                onClick={recapture}
                className="font-medium text-ink-700 underline-offset-2 hover:underline focus-ring"
              >
                Re-capture
              </button>
            </p>
          </div>
        ) : geoState === "denied" ? (
          <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-fall">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>
              Location permission denied. The browser needs to share your
              location for the geofence check.
              {geoErr && <span className="block text-xs text-ash-500">{geoErr}</span>}
            </span>
          </p>
        ) : geoState === "unsupported" ? (
          <p className="mt-1 text-sm text-fall">
            This browser doesn't expose location services.
          </p>
        ) : (
          <p className="mt-1 text-sm text-ash-500">Locating…</p>
        )}
      </div>

      {/* Big action button */}
      <div className="flex items-center gap-3">
        <SubmitBtn direction={optimistic} ready={geofenceExempt || geoState === "ok"} />
        <p className="text-xs text-ash-600">
          {lastDirection === "IN"
            ? "You're currently clocked in."
            : lastDirection === "OUT"
              ? "You clocked out earlier. Click to clock in again."
              : "You haven't clocked in yet today."}
          {defaultShift && (
            <span className="block text-[11px] text-ash-500">
              Shift: {defaultShift}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}

function SubmitBtn({
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
