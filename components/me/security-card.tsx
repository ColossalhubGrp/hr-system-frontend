import { ShieldCheck } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { signOutEverywhereAction } from "@/app/(workspace)/me/security-actions";

type SecurityInfo = {
  last_login: string;
  last_ip: string;
  active_sessions: number | null;
  recent_sign_ins: Array<{ when: string; ip: string; ok: boolean }>;
};

function prose(dt: string): string {
  if (!dt) return "—";
  const d = new Date(dt.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dt;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/**
 * The /me Security card: your own sign-in picture (last sign-in, where
 * from, how many devices are signed in, recent attempts) and the
 * sign-out-everywhere control.
 */
export async function SecurityCard() {
  let info: SecurityInfo | null = null;
  try {
    info = await frappeCall<SecurityInfo>({
      method: "recruitment_app.api.security.security_info",
      as: "user",
    });
  } catch {
    return null; // backend not updated yet — card simply doesn't render
  }
  if (!info) return null;

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ash-900">
          <ShieldCheck className="h-4 w-4 text-ash-500" />
          Security
        </h2>
        <form action={signOutEverywhereAction}>
          <button
            type="submit"
            className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ash-700 transition hover:border-destructive/40 hover:text-destructive"
          >
            Sign out of all devices
          </button>
        </form>
      </div>

      <p className="text-sm text-ash-700">
        Last signed in {prose(info.last_login)}
        {info.last_ip ? ` from ${info.last_ip}` : ""}
        {typeof info.active_sessions === "number"
          ? ` · ${info.active_sessions} active session${info.active_sessions === 1 ? "" : "s"}`
          : ""}
      </p>

      {info.recent_sign_ins.length > 0 && (
        <ul className="divide-y divide-hairline text-xs text-ash-600">
          {info.recent_sign_ins.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-1.5">
              <span className={s.ok ? "" : "font-medium text-destructive"}>
                {s.ok ? "Signed in" : "Failed attempt"}
              </span>
              <span className="tabular-nums">
                {prose(s.when)}
                {s.ip ? ` · ${s.ip}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-ash-500">
        Don&apos;t recognise one of these? Change your password, then sign
        out of all devices.
      </p>
    </section>
  );
}
