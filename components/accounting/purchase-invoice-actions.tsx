"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Send, Ban } from "lucide-react";
import {
  submitPurchaseInvoiceAction,
  cancelPurchaseInvoiceAction,
} from "@/app/(workspace)/accounting/purchase-invoices/actions";
import { cn } from "@/lib/cn";

export function PurchaseInvoiceActions({
  name,
  docstatus,
}: {
  name: string;
  docstatus: 0 | 1 | 2;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (docstatus === 2) return null;
  const isDraft = docstatus === 0;

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const action = isDraft ? submitPurchaseInvoiceAction : cancelPurchaseInvoiceAction;
      const result = await action(name);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-chip px-3 text-sm font-semibold text-white transition focus-ring",
          isDraft ? "bg-ink-800 hover:bg-ink-700" : "bg-destructive hover:bg-destructive/90",
          pending && "cursor-not-allowed opacity-60",
        )}
      >
        {isDraft ? <Send className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
        {pending ? (isDraft ? "Submitting…" : "Cancelling…") : isDraft ? "Submit" : "Cancel"}
      </button>
      {error && (
        <div className="flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
