import Link from "next/link";
import type { Route } from "next";
import {
  listPayRuns,
  listMissingCriticalInfo,
} from "@/lib/payroll-engine/payruns";
import { NewPeriodModal } from "@/components/payroll/new-period-modal";
import { ActionRequiredBanner } from "@/components/payroll/action-required-banner";
import { PayRunsList } from "@/components/payroll/pay-runs-list";

export const metadata = { title: "Pay Runs · Payroll · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function PayRunsPage() {
  const [periods, missing] = await Promise.all([
    listPayRuns(),
    listMissingCriticalInfo(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Pay Runs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every period flows: Open → Process → Close.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewPeriodModal />
          <Link
            href={"/payroll/off-cycle" as Route}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40"
          >
            Create an off-cycle pay run
          </Link>
          <Link
            href={"/payroll/terminate" as Route}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            title="Retrenchment / final payout with ZIMRA §14 exemption"
          >
            Terminate employee
          </Link>
        </div>
      </header>

      <ActionRequiredBanner items={missing} />

      <PayRunsList runs={periods} />
    </div>
  );
}
