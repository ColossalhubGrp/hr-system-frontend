import { ScrollText, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { TermsForm } from "@/components/accounting/terms-form";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { title: "New Terms and Conditions · Colossal HR" };

export default function NewTermsPage() {
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
        crumb="Accounting · Masters · Terms · New"
        title="New Terms and Conditions"
        subtitle="A reusable legal-text block printed on quotes, orders and invoices."
      />
      <TermsForm mode="create" />
    </div>
  );
}
