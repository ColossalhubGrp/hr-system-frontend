import { ShieldCheck, ShieldAlert } from "lucide-react";
import { getFiscalHealth } from "@/lib/frappe/fiscalisation";

/**
 * Quiet ZIMRA fiscalisation status in the accounting hero: green when
 * the fiscal day is healthy, amber when receipts are queued offline.
 * Hidden entirely when fiscalisation isn't configured — no noise for
 * businesses that don't need it.
 */
export async function FiscalChip() {
  let health: Awaited<ReturnType<typeof getFiscalHealth>> | null = null;
  try {
    health = await getFiscalHealth();
  } catch {
    return null;
  }
  if (!health || !health.enabled) return null;

  const queued = Number(health.queueSize ?? 0);
  const ok = health.ok !== false && queued === 0;
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
      title="ZIMRA fiscalisation status"
    >
      {ok ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
      {ok
        ? "ZIMRA fiscalisation live"
        : queued > 0
        ? `ZIMRA: ${queued} receipt${queued === 1 ? "" : "s"} queued`
        : "ZIMRA fiscalisation offline"}
    </span>
  );
}
