import { Banknote } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { BankForm } from "@/components/accounting/bank-form";

export const metadata = { title: "New Bank · Colossal HR" };

export default function NewBankPage() {
  return (
    <div className="flex flex-col gap-5">
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
