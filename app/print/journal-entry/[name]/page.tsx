import { notFound, redirect } from "next/navigation";
import { getJournalEntry } from "@/lib/frappe/accounting";
import { isAuthenticated } from "@/lib/frappe/session";
import {
  DocumentShell,
  DocMetaRow,
  DocSignatures,
  docMoney,
} from "@/components/print/document-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${decodeURIComponent(params.name)} · Journal Voucher` };
}

export default async function JournalEntryPrintPage({ params }: { params: { name: string } }) {
  if (!isAuthenticated()) redirect("/login");
  const name = decodeURIComponent(params.name);
  const doc = await getJournalEntry(name);
  if (!doc) notFound();

  const stamps: Array<{ text: string; tone?: "danger" | "muted" }> = [];
  if (doc.docstatus === 0) stamps.push({ text: "Draft — not yet posted" });
  if (doc.docstatus === 2) stamps.push({ text: "Cancelled", tone: "danger" });

  return (
    <DocumentShell company={doc.company} title="JOURNAL VOUCHER" docNo={doc.name} stamps={stamps}>
      <div className="mt-5 flex justify-between gap-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">Entry type</div>
          <div className="mt-1 text-base font-semibold">{doc.voucherType}</div>
        </div>
        <table className="text-right">
          <tbody>
            <DocMetaRow label="Posting date" value={doc.postingDate} />
            {doc.chequeNo && <DocMetaRow label="Reference no." value={doc.chequeNo} />}
            {doc.chequeDate && <DocMetaRow label="Reference date" value={doc.chequeDate} />}
          </tbody>
        </table>
      </div>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left text-xs font-bold uppercase tracking-wide">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Account</th>
            <th className="py-2 pr-2">Cost Centre</th>
            <th className="py-2 pr-2 text-right">Debit</th>
            <th className="py-2 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {doc.accounts.map((l) => (
            <tr key={l.idx} className="border-b border-neutral-200 align-top">
              <td className="py-2 pr-2 text-neutral-500">{l.idx}</td>
              <td className="py-2 pr-2">
                <div className="font-medium">{l.account}</div>
                {l.party && (
                  <div className="text-xs text-neutral-500">
                    {l.partyType}: {l.party}
                  </div>
                )}
                {doc.multiCurrency && l.accountCurrency && l.exchangeRate !== 1 && (
                  <div className="text-xs text-neutral-500">
                    {l.accountCurrency} @ {l.exchangeRate}
                  </div>
                )}
              </td>
              <td className="py-2 pr-2 text-neutral-600">{l.costCenter ?? "—"}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                {l.debitInAccountCurrency ? docMoney(l.debitInAccountCurrency) : ""}
              </td>
              <td className="py-2 text-right tabular-nums">
                {l.creditInAccountCurrency ? docMoney(l.creditInAccountCurrency) : ""}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-900 font-bold">
            <td className="py-2 pr-2" colSpan={3}>
              Total
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">{docMoney(doc.totalDebit)}</td>
            <td className="py-2 text-right tabular-nums">{docMoney(doc.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>

      {doc.userRemark && (
        <div className="mt-6 text-xs text-neutral-600">
          <span className="font-bold uppercase tracking-wide">Narration: </span>
          {doc.userRemark}
        </div>
      )}

      <DocSignatures labels={["Prepared by", "Checked by", "Approved by"]} />
    </DocumentShell>
  );
}
