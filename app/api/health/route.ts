import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Liveness endpoint for uptime monitoring (e.g. UptimeRobot pointed
 * at https://app.colossalhub.com/api/health). Reports its own health
 * plus whether the control-site backend answers ping within 2.5s —
 * so one probe covers both halves of the stack. Public by design;
 * returns no data beyond up/down.
 */
export async function GET() {
  let frappe: "up" | "down" = "down";
  try {
    const res = await fetch(
      new URL("/api/method/ping", serverEnv().FRAPPE_URL),
      { cache: "no-store", signal: AbortSignal.timeout(2500) },
    );
    if (res.ok) frappe = "up";
  } catch {
    /* down */
  }
  const ok = frappe === "up";
  return NextResponse.json(
    { ok, frappe, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
