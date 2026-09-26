import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BookText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getFinanceBook } from "@/lib/frappe/masters/finance-book";
import { FinanceBookForm } from "@/components/accounting/finance-book-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Finance Book · Colossal HR` };
}

export default async function EditFinanceBookPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getFinanceBook(name);
  if (!doc) notFound();
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
        crumb={`Accounting · Masters · Finance Books · ${doc.financeBookName}`}
        title={doc.financeBookName}
      />
      <FinanceBookForm mode="edit" name={doc.name} initial={{ financeBookName: doc.financeBookName }} />
    </div>
  );
}
