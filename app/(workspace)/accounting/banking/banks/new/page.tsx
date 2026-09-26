import { Banknote, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { BankForm } from "@/components/accounting/bank-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Bank · Colossal HR" };

export default function NewBankPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/banking/banks" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Banks
        </Link>
      </div>
      <PageHeader
        icon={Banknote}
        crumb="Accounting · Banking · Banks · New"
        title="New Bank"
        subtitle="A financial institution — the accounts you hold there link to this."
      />
      <BankForm mode="create" />
    </div>
  );
}
