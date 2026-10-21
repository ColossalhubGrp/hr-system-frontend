import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, HandCoins } from "lucide-react";
import { AmortizationCalculator } from "@/components/loans/amortization-calculator";
import { LoanDeductionSetup } from "@/components/loans/loan-deduction-setup";
import { listEmployeeDirectory } from "@/lib/frappe/employee-write";
import { listSalaryComponents } from "@/lib/frappe/pay-adjustments";

export const metadata = { title: "Loan schedule · Loans · Colossal ERP" };
export const dynamic = "force-dynamic";

type SP = { principal?: string; rate?: string; months?: string; start?: string };

export default async function LoanSchedulePage({ searchParams }: { searchParams: SP }) {
  const principal = Number(searchParams.principal) || 0;
  const rateAnnualPct = Number(searchParams.rate) || 0;
  const months = Number(searchParams.months) || 0;
  const start = searchParams.start || new Date().toISOString().slice(0, 10);

  // Load directory + deduction components in parallel so the "Set up
  // recurring deduction" form can render inline without a round-trip.
  const [employeeDirectory, components] = await Promise.all([
    listEmployeeDirectory(),
    listSalaryComponents({ type: "Deduction" }).catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href={"/loans" as Route} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Loans
      </Link>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">— Loans</div>
        <h1 className="mt-1 flex items-center gap-2 text-[22px] font-bold leading-tight tracking-tight text-foreground">
          <HandCoins className="h-5 w-5 text-primary" />
          Loan repayment schedule
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Enter the loan terms to generate a month-by-month amortization table. Then set up the
          recurring payroll deduction below so the capital balance reduces automatically each pay run.
        </p>
      </div>

      <AmortizationCalculator
        defaultPrincipal={principal}
        defaultRatePct={rateAnnualPct}
        defaultMonths={months}
        defaultStart={start}
      />

      <LoanDeductionSetup
        employeeDirectory={employeeDirectory}
        components={components.map((c) => c.name)}
      />
    </div>
  );
}
