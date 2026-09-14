"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { toast } from "@/components/ui/sonner";
import { deleteCompanyAction } from "@/app/(workspace)/settings/company/actions";

/** Small trash icon that opens a confirm dialog and calls the delete
 *  server action. Frappe rejects a Company delete if anything links to
 *  it (Employee, GL Entry, Salary Slip, …) — that error is surfaced as
 *  a toast so HR sees why. */
export function CompanyDeleteButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <ConfirmDialog
      title={`Delete "${label}"?`}
      description="Only a Company with no linked records (Employees, transactions, salary slips) can be deleted. If anything is attached, Frappe will refuse."
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const r = await deleteCompanyAction(id);
        if (!r.ok) toast.error(r.error);
        else toast.success(`Deleted "${label}".`);
      }}
    >
      <Button variant="ghost" size="icon" aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </ConfirmDialog>
  );
}
