import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, HandCoins } from "lucide-react";
import { AmortizationCalculator } from "@/components/loans/amortization-calculator";

export const metadata = { title: "Loan schedule · Loans · Colossal ERP" };
export const dynamic = "force-dynamic";

type SP = { principal?: string; rate?: string; months?: string; start?: string };

export default function LoanSchedulePage({ searchParams }: { searchParams: SP }) {
  const principal = Number(searchParams.principal) || 0;
  const rateAnnualPct = Number(searchParams.rate) || 0;
  const months = Number(searchParams.months) || 0;
  const start = searchParams.start || new Date().toISOString().slice(0, 10);

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
          Repayment schedule
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Enter the loan terms to generate a month-by-month amortization table. The outstanding
          capital reduces by the principal portion each month until paid off.
        </p>
      </div>

      <AmortizationCalculator
        defaultPrincipal={principal}
        defaultRatePct={rateAnnualPct}
        defaultMonths={months}
        defaultStart={start}
      />

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-[13px] text-muted-foreground">
        <strong className="font-semibold text-foreground">To deduct this loan from salary each month:</strong>{" "}
        add a recurring deduction in <Link href={"/payroll/adjustments" as Route} className="font-medium text-primary hover:underline">Payroll → Adjustments</Link> with
        amount = this month&apos;s EMI, for the loan&apos;s duration. The payroll engine will apply the
        deduction every run until the end date and the capital balance drops by the principal
        portion each month.
      </div>
    </div>
  );
}
