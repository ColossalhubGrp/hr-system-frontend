import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { TermsForm } from "@/components/accounting/terms-form";

export const metadata = { title: "New Terms and Conditions · Colossal HR" };

export default function NewTermsPage() {
  return (
    <div className="flex flex-col gap-5">
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
