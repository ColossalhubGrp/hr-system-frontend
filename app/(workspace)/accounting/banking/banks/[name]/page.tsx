import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Banknote, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getBank } from "@/lib/frappe/banking/bank";
import { BankForm } from "@/components/accounting/bank-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Bank · Colossal HR` };
}

export default async function EditBankPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getBank(name);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/banking/banks" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Banks
        </Link>
      </div>
      <PageHeader icon={Banknote} crumb={`Accounting · Banking · Banks · ${doc.bankName}`} title={doc.bankName} />
      <BankForm mode="edit" name={doc.name} initial={{ bankName: doc.bankName, swiftNumber: doc.swiftNumber, website: doc.website }} />
    </div>
  );
}
