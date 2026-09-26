import { BookText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FinanceBookForm } from "@/components/accounting/finance-book-form";

export const metadata = { title: "New Finance Book · Colossal HR" };

export default function NewFinanceBookPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={BookText}
        crumb="Accounting · Masters · Finance Books · New"
        title="New Finance Book"
        subtitle="A separate ledger view of the same postings — for parallel reporting."
      />
      <FinanceBookForm mode="create" />
    </div>
  );
}
