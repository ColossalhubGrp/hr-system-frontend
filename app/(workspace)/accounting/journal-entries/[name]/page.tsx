import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { getJournalEntry } from "@/lib/frappe/accounting";
import { JournalEntryActions } from "@/components/accounting/journal-entry-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { name: string };
}) {
  return { title: `${decodeURIComponent(params.name)} · Journal Entry · Colossal HR` };
}

export default async function JournalEntryDetailPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);
  const doc = await getJournalEntry(name);
  if (!doc) notFound();

  const statusLabel =
    doc.docstatus === 0 ? "Draft" : doc.docstatus === 1 ? "Submitted" : "Cancelled";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={"/accounting/journal-entries" as Route}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Journal Entries
        </Link>
      </div>

      <PageHeader
        icon={BookOpen}
        crumb={`Accounting · Journal Entries · ${doc.name}`}
        title={doc.name}
        subtitle={`${doc.voucherType} · ${doc.postingDate} · ${doc.company}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill status={statusLabel} />
            <JournalEntryActions name={doc.name} docstatus={doc.docstatus} />
          </div>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Voucher
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Type" value={doc.voucherType} />
          <Detail label="Posting Date" value={doc.postingDate} />
          <Detail label="Company" value={doc.company} />
          <Detail label="Currency" value={doc.multiCurrency ? "Multi-currency" : "Single currency"} />
          <Detail label="Cheque / Ref no." value={doc.chequeNo ?? "—"} />
          <Detail label="Cheque / Ref date" value={doc.chequeDate ?? "—"} />
          <Detail
            label="Amended from"
            value={
              doc.amendedFrom ? (
                <Link
                  href={`/accounting/journal-entries/${encodeURIComponent(doc.amendedFrom)}` as Route}
                  className="font-mono text-sm text-ink-800 underline-offset-4 hover:underline"
                >
                  {doc.amendedFrom}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Detail label="Difference" value={doc.difference.toFixed(2)} />
        </div>
        {doc.userRemark && (
          <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remark</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{doc.userRemark}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lines
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Account</th>
                <th className="py-2 text-left">Party</th>
                <th className="py-2 text-right">Debit</th>
                <th className="py-2 text-right">Credit</th>
                <th className="py-2 text-left">Cost Center</th>
                <th className="py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {doc.accounts.map((l) => (
                <tr key={l.idx} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground">{l.idx}</td>
                  <td className="py-2 pr-2 font-medium">
                    {l.account}
                    {l.accountCurrency && l.accountCurrency !== "USD" && (
                      <span className="ml-1 text-xs text-muted-foreground">({l.accountCurrency})</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {l.party ? `${l.partyType ?? ""} · ${l.party}` : "—"}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {l.debitInAccountCurrency ? l.debitInAccountCurrency.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {l.creditInAccountCurrency ? l.creditInAccountCurrency.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{l.costCenter ?? "—"}</td>
                  <td className="py-2 text-muted-foreground">
                    {l.referenceType && l.referenceName
                      ? `${l.referenceType} · ${l.referenceName}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border/70 font-semibold">
                <td colSpan={3} className="py-2 text-right text-muted-foreground">
                  Totals
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{doc.totalDebit.toFixed(2)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{doc.totalCredit.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}
