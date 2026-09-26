import { BookText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { FinanceBookForm } from "@/components/accounting/finance-book-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Finance Book · Colossal HR" };

export default function NewFinanceBookPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/finance-books" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Finance Books
        </Link>
      </div>
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
