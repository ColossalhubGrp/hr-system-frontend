import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NewPayRunForm } from "@/components/payroll/new-pay-run-form";
import {
  getCompanyPayrollDefaults,
  getCompanyPayrollSettings,
} from "@/lib/payroll-engine/doctype-helpers";

export const metadata = { title: "New pay run · Payroll · Colossal HR" };

export default async function NewPayRunPage() {
  // Pre-load company pay frequency + currency + payable account so the
  // form's defaults match the company's standing config and the user can
  // create a run in one step.
  const [settings, defaults] = await Promise.all([
    getCompanyPayrollSettings(),
    getCompanyPayrollDefaults(),
  ]);
  const frequency = mapFrappeFrequency(settings?.pay_frequency);

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs text-muted-foreground">
        <Link href={"/payroll" as Route}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to pay runs
        </Link>
      </Button>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" />
          Payroll · New
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Start a pay run
        </h1>
        <p className="text-sm text-muted-foreground">
          Creates a draft Payroll Entry. The next step is the Run Payroll
          wizard, where you review per-employee pay, resolve any missing
          info, and approve the run before pay date.
        </p>
      </header>

      <Card className="p-5">
        <NewPayRunForm
          defaultFrequency={frequency}
          defaultCurrency={defaults?.defaultCurrency ?? "USD"}
          defaultPayableAccount={defaults?.defaultPayrollPayableAccount ?? null}
          payableAccounts={defaults?.payableAccounts ?? []}
        />
      </Card>
    </div>
  );
}

function mapFrappeFrequency(
  settings: string | undefined,
): "Weekly" | "Fortnightly" | "Bimonthly" | "Monthly" | "Daily" {
  // Company Payroll Settings uses Rippling-style labels; Frappe Payroll
  // Entry uses ERPNext-style labels. Translate so the form sets the
  // closest match.
  switch (settings) {
    case "Weekly":
      return "Weekly";
    case "Bi-weekly":
      return "Fortnightly";
    case "Semi-monthly":
      return "Bimonthly";
    case "Daily":
      return "Daily";
    default:
      return "Monthly";
  }
}
