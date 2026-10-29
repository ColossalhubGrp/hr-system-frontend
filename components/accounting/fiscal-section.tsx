"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, RefreshCw, Undo2 } from "lucide-react";
import { retryFiscalisationAction } from "@/app/(workspace)/accounting/sales-invoices/actions";
import { cn } from "@/lib/cn";

/** ZIMRA fiscalisation panel on the Sales Invoice detail page.
 *  Renders nothing when the invoice has no fiscal state (feature off). */
export function FiscalSection({
  name,
  status,
  receiptNo,
  dayNo,
  qrData,
  creditNoteReceiptNo,
  error,
}: {
  name: string;
  status: string | null;
  receiptNo: number | null;
  dayNo: number | null;
  qrData: string | null;
  creditNoteReceiptNo: number | null;
  error: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  if (!status) return null;

  const badge =
    status === "Fiscalised"
      ? { icon: CheckCircle2, text: "Sent to ZIMRA", cls: "bg-rise/10 text-rise" }
      : status === "Reversed"
      ? { icon: Undo2, text: "Reversed with credit note", cls: "bg-muted text-muted-foreground" }
      : status === "Queued"
      ? { icon: Clock, text: "Waiting to send (ZIMRA unreachable)", cls: "bg-amber-500/10 text-amber-600" }
      : { icon: AlertCircle, text: "Not sent to ZIMRA", cls: "bg-destructive/10 text-destructive" };
  const Icon = badge.icon;

  const retry = () => {
    setRetryError(null);
    startTransition(async () => {
      const result = await retryFiscalisationAction(name);
      if (result?.error) setRetryError(result.error);
    });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ZIMRA Fiscal Receipt
        </h2>
        <span className={cn("inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-semibold", badge.cls)}>
          <Icon className="h-3.5 w-3.5" />
          {badge.text}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {qrData && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-border/60 bg-white p-2">
              <QRCodeSVG value={qrData} size={128} marginSize={0} />
            </div>
            <a
              href={qrData}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Check on ZIMRA
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <FiscalDetail label="Receipt number" value={receiptNo ?? "—"} />
          <FiscalDetail label="Fiscal day" value={dayNo ?? "—"} />
          {creditNoteReceiptNo != null && (
            <FiscalDetail label="Credit note receipt" value={creditNoteReceiptNo} />
          )}
        </div>
      </div>

      {(status === "Failed" || error) && (
        <div className="mt-4 flex flex-col gap-2">
          {(retryError || error) && (
            <p className="text-sm text-destructive">{retryError || error}</p>
          )}
          {status === "Failed" && (
            <button
              type="button"
              onClick={retry}
              disabled={pending}
              className={cn(
                "inline-flex w-max items-center gap-1.5 rounded-chip border border-input px-3 py-1.5 text-sm font-semibold hover:bg-muted/40",
                pending && "cursor-not-allowed opacity-60",
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
              {pending ? "Sending…" : "Send to ZIMRA again"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FiscalDetail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm tabular-nums text-foreground">{value}</div>
    </div>
  );
}
