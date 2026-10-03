import Link from "next/link";
import type { Route } from "next";
import { Receipt, FileSpreadsheet, BookOpen, Wallet, ArrowRight } from "lucide-react";
import type { OverviewData } from "../_lib/overview-data";

function fmtWhen(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const KIND_META: Record<
  OverviewData["recent"][number]["kind"],
  { icon: typeof Receipt; tone: string; routeBase: string }
> = {
  "Sales Invoice":    { icon: Receipt,         tone: "text-emerald-700 bg-emerald-50", routeBase: "/accounting/sales-invoices" },
  "Purchase Invoice": { icon: FileSpreadsheet, tone: "text-rose-700 bg-rose-50",       routeBase: "/accounting/purchase-invoices" },
  "Journal Entry":    { icon: BookOpen,        tone: "text-primary bg-primary/10",     routeBase: "/accounting/journal-entries" },
  "Payment Entry":    { icon: Wallet,          tone: "text-amber-700 bg-amber-50",     routeBase: "/accounting/payment-entries" },
};

/**
 * Last 10 postings across every ledger-affecting doctype, sorted
 * newest first. Each row is a Link into the detail page so audit
 * follow-up is one click away.
 */
export function RecentActivity({ data }: { data: OverviewData }) {
  const rows = data.recent;
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-bold text-foreground">Recent activity</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">last {rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">No postings yet.</div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const meta = KIND_META[r.kind];
            const Icon = meta.icon;
            return (
              <li key={`${r.kind}:${r.name}`}>
                <Link
                  href={`${meta.routeBase}/${encodeURIComponent(r.name)}` as Route}
                  className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/30"
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {r.party ?? r.kind}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">· {r.kind}</span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      <span className="font-mono">{r.name}</span>
                      <span className="mx-1">·</span>
                      {fmtWhen(r.at)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums text-foreground">
                      {r.currency ?? ""} {fmtAmount(r.amount)}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
