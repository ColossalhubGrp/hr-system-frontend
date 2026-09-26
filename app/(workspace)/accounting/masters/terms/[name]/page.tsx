import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ScrollText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getTerms } from "@/lib/frappe/masters/terms-and-conditions";
import { TermsForm } from "@/components/accounting/terms-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Terms · Colossal HR` };
}

export default async function EditTermsPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name);
  const doc = await getTerms(name);
  if (!doc) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href={"/accounting/masters/terms" as Route} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Terms and Conditions
        </Link>
      </div>
      <PageHeader
        icon={ScrollText}
        crumb={`Accounting · Masters · Terms · ${doc.title}`}
        title={doc.title}
        subtitle={doc.disabled ? "Disabled" : "Active"}
      />
      <TermsForm
        mode="edit"
        name={doc.name}
        initial={{ title: doc.title, disabled: doc.disabled, terms: doc.terms }}
      />
    </div>
  );
}
