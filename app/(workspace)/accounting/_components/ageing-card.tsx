import Link from "next/link";
import type { Route } from "next";
import { formatMoney } from "@/lib/format";
import type { OverviewData, AgeBucket } from "../_lib/overview-data";

/**
 * Ageing — how old the money you're owed (and owe) is. One stacked
 * bar per side, Current → 90+ running from brand navy out to the
 * error red, with the figures beneath. Clicks land on the invoice
 * lists.
 */
export function AgeingCard({ data }: { data: OverviewData }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Ageing — receivables and payables
      </div>
      <div className="flex flex-col gap-5">
        <AgeingRow
          title="Owed to us"
          buckets={data.ageing.ar}
          href="/accounting/sales-invoices"
        />
        <AgeingRow
          title="We owe"
          buckets={data.ageing.ap}
          href="/accounting/purchase-invoices"
        />
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Outstanding amounts on posted invoices, aged by due date.
      </p>
    </div>
  );
}

const BUCKET_COLOURS = [
  "bg-primary",        // Current — navy
  "bg-emerald-600",    // 1–30 — still healthy
  "bg-amber-500",      // 31–60 — attention
  "bg-amber-700",      // 61–90 — overdue
  "bg-rose-600",       // 90+ — problem
];

function AgeingRow({
  title,
  buckets,
  href,
}: {
  title: string;
  buckets: AgeBucket[];
  href: string;
}) {
  const total = buckets.reduce((a, b) => a + b.amount, 0);
  return (
    <Link href={href as Route} className="group block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground group-hover:underline">
          {title}
        </span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {formatMoney(total, "USD")}
        </span>
      </div>
      {total > 0 ? (
        <>
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
            {buckets.map((b, i) =>
              b.amount > 0 ? (
                <div
                  key={b.label}
                  className={BUCKET_COLOURS[i]}
                  style={{ width: `${Math.max(1.5, (b.amount / total) * 100)}%` }}
                  title={`${b.label}: ${formatMoney(b.amount, "USD")}`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {buckets.map((b, i) =>
              b.amount > 0 ? (
                <span key={b.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`inline-block h-2 w-2 rounded-full ${BUCKET_COLOURS[i]}`} />
                  {b.label}: <span className="font-semibold tabular-nums">{formatMoney(b.amount, "USD")}</span>
                </span>
              ) : null,
            )}
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">Nothing outstanding.</p>
      )}
    </Link>
  );
}
