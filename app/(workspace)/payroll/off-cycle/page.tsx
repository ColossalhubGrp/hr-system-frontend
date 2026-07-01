import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { OffCycleWizard } from "@/components/payroll/off-cycle-wizard";

export const metadata = { title: "Off-cycle pay run · Payroll · Colossal HR" };

export default function OffCyclePage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={"/payroll" as Route}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to pay runs
      </Link>
      <OffCycleWizard />
    </div>
  );
}
