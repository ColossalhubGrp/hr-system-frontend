import Link from "next/link";
import type { Route } from "next";
import { ShieldCheck, ChevronLeft, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import {
  getFiscalisationSettings,
  getFiscalHealth,
  type FiscalHealth,
} from "@/lib/frappe/fiscalisation";
import { FiscalisationSettingsForm } from "@/components/accounting/fiscalisation-settings-form";

export const metadata = { title: "ZIMRA Fiscalisation · Accounting · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function FiscalisationSettingsPage() {
  const [settings, health] = await Promise.all([
    getFiscalisationSettings(),
    getFiscalHealth(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </Link>
      </div>
      <PageHeader
        icon={ShieldCheck}
        crumb="Accounting · Masters · ZIMRA Fiscalisation"
        title="ZIMRA Fiscalisation"
        subtitle="Report sales invoices to ZIMRA automatically, with a fiscal receipt and QR code on each one."
      />

      {settings.enabled && <HealthCard health={health} />}

      <FiscalisationSettingsForm initial={settings} />
    </div>
  );
}

function HealthCard({ health }: { health: FiscalHealth }) {
  const queued = health.queueSize ?? 0;
  const hoursPending = health.oldestPendingAgeMs
    ? Math.floor(health.oldestPendingAgeMs / 3_600_000)
    : 0;

  let icon = CheckCircle2;
  let cls = "border-rise/30 bg-rise/5 text-rise";
  let text = "Connected to ZIMRA. Invoices are being reported.";

  if (health.ok === false) {
    icon = AlertCircle;
    cls = "border-destructive/30 bg-destructive/5 text-destructive";
    text = `The fiscal service is not responding${health.message ? ` — ${health.message}` : ""}. Invoices will show as "Not sent" until it's back.`;
  } else if (health.registered === false) {
    icon = AlertCircle;
    cls = "border-amber-500/30 bg-amber-500/5 text-amber-600";
    text = "The fiscal device is not registered yet. Register it with the device details from ZIMRA before invoices can be reported.";
  } else if (queued > 0) {
    icon = Clock;
    cls = "border-amber-500/30 bg-amber-500/5 text-amber-600";
    text = `${queued} invoice${queued === 1 ? "" : "s"} waiting to reach ZIMRA (oldest ${hoursPending}h). They are sent automatically when the connection returns — ZIMRA allows up to 72 hours.`;
  }

  const Icon = icon;
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{text}</div>
    </div>
  );
}
