import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { listCompanies, listAccounts } from "@/lib/frappe/accounting";
import { listBankAccounts } from "@/lib/frappe/banking/bank-account";
import { NewBankClearanceForm } from "@/components/accounting/new-bank-clearance-form";

export const metadata = { title: "New Bank Clearance · Colossal HR" };
export const dynamic = "force-dynamic";

export default async function NewBankClearancePage() {
  const companies = await listCompanies();
  const firstCompany = companies[0]?.name ?? "";
  const [accounts, banks] = await Promise.all([
    firstCompany ? listAccounts(firstCompany, { limit: 100 }) : Promise.resolve([]),
    listBankAccounts(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ArrowLeftRight}
        crumb="Accounting · Banking · Clearance · New"
        title="New Bank Clearance"
        subtitle="Start a batch — pick the account and range, then load payments to mark cleared."
      />
      <NewBankClearanceForm accounts={accounts} bankAccounts={banks.map((b) => b.name)} defaultDate={today} />
    </div>
  );
}
