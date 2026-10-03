import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, Circle, ArrowRight, Info } from "lucide-react";
import { frappeCall } from "@/lib/frappe/client";
import { myCompany } from "@/lib/references/server";

type StepId =
  | "chart_of_accounts"
  | "taxes"
  | "settings"
  | "cost_centers"
  | "first_purchase_invoice"
  | "opening_balances"
  | "financial_statements";

type Step = {
  id: StepId;
  title: string;
  blurb: string;
  href: string;
  cta: string;
  done: boolean;
  /** Set to true when the step is navigation-only (no reliable
   *  completion signal), so it never counts against the % done. */
  informational?: boolean;
};

async function count(doctype: string, filters: Record<string, unknown> = {}): Promise<number> {
  try {
    const n = await frappeCall<number>({
      method: "frappe.client.get_count",
      args: { doctype, filters: JSON.stringify(filters) },
      as: "user",
    });
    return Number(n ?? 0);
  } catch {
    return 0;
  }
}

export async function SetupChecklist() {
  const company = await myCompany();
  // Chart of Accounts: ERPNext's default seed drops ~30 accounts per company.
  // We only count it "done" when there are MORE than the default seed —
  // meaning HR has started adding their own.
  const [coa, taxes, costCenters, purchaseInvs, openingJE] = await Promise.all([
    count("Account", company ? { company } : {}),
    count("Sales Taxes and Charges Template", company ? { company } : {}),
    count("Cost Center", company ? { company } : {}),
    count("Purchase Invoice", company ? { company } : {}),
    count("Journal Entry", { is_opening: "Yes", ...(company ? { company } : {}) }),
  ]);

  const steps: Step[] = [
    {
      id: "chart_of_accounts",
      title: "Review the chart of accounts",
      blurb: "Every ledger entry has to post against an account. Check the seeded tree and add any sector-specific accounts you need.",
      href: "/accounting/chart-of-accounts",
      cta: "Open chart",
      done: coa > 30,
    },
    {
      id: "taxes",
      title: "Set up taxes",
      blurb: "Create at least one Sales / Purchase tax template so new invoices know what rate to apply.",
      href: "/accounting/tax/sales-templates",
      cta: "Add tax template",
      done: taxes >= 1,
    },
    {
      id: "settings",
      title: "Confirm accounts settings",
      blurb: "Site-wide switches — stock mode, credit control, backdated-entry policy, close-period strictness.",
      href: "/accounting/masters/settings",
      cta: "Review settings",
      done: false,
      informational: true,
    },
    {
      id: "cost_centers",
      title: "Add cost centres",
      blurb: "Slice the P&L by branch, department or project so reports break down the right way.",
      href: "/accounting/cost-centers",
      cta: "Add cost centre",
      done: costCenters > 1, // ERPNext seeds a default "Main" per company
    },
    {
      id: "first_purchase_invoice",
      title: "Record your first purchase invoice",
      blurb: "Prove the pipeline end-to-end with one supplier bill. The ledger will post against your chosen expense account.",
      href: "/accounting/purchase-invoices/new",
      cta: "Create invoice",
      done: purchaseInvs >= 1,
    },
    {
      id: "opening_balances",
      title: "Load opening balances",
      blurb: "Carry over outstanding customer / supplier balances and GL opening positions from your previous system.",
      href: "/accounting/tools/opening-invoices",
      cta: "Open the import tool",
      done: openingJE >= 1,
    },
    {
      id: "financial_statements",
      title: "View the financial statements",
      blurb: "Profit & Loss, Balance Sheet, Cash Flow — the audit-grade views the ledger produces for the period.",
      href: "/accounting/reports/profit-and-loss",
      cta: "Open P&L",
      done: false,
      informational: true,
    },
  ];

  const quantifiable = steps.filter((s) => !s.informational);
  const doneCount = quantifiable.filter((s) => s.done).length;
  const pct = quantifiable.length
    ? Math.round((doneCount / quantifiable.length) * 100)
    : 0;

  return (
    <SetupChecklistCard
      steps={steps}
      doneCount={doneCount}
      total={quantifiable.length}
      pct={pct}
    />
  );
}

/** Server-rendered checklist card. Can be dismissed on the client — see
 *  SetupChecklistWrapper below. */
function SetupChecklistCard({
  steps, doneCount, total, pct,
}: {
  steps: Step[]; doneCount: number; total: number; pct: number;
}) {
  const bannerCls =
    pct === 100
      ? "border-emerald-200 bg-emerald-50"
      : "border-primary/20 bg-primary/[0.03]";
  return (
    <section className={`rounded-xl border ${bannerCls} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-primary">
            First-time setup
          </div>
          <h2 className="mt-1 text-lg font-bold text-foreground">
            {pct === 100
              ? "Setup complete — the ledger is wired."
              : "Let’s set up your accounts and taxes."}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A short checklist — tick each one off and the ledger is ready to post real entries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing pct={pct} />
          <div className="text-xs text-muted-foreground">
            <div className="font-bold text-foreground">{doneCount} / {total}</div>
            <div>complete</div>
          </div>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.id}
              className="group flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3 transition hover:border-primary/30">
            <StepIcon done={s.done} informational={s.informational} index={i + 1} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`truncate text-sm font-semibold ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {s.title}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    {s.blurb}
                  </p>
                </div>
                {s.informational && (
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-label="Informational step — no automatic completion detection" />
                )}
              </div>
              <Link href={s.href as Route}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                {s.cta}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepIcon({ done, informational, index }: { done: boolean; informational?: boolean; index: number }) {
  if (done) return (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
  );
  if (informational) return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-dashed border-muted-foreground/40 text-[10px] font-bold text-muted-foreground">
      {index}
    </span>
  );
  return (
    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
      <circle cx="22" cy="22" r={r} className="fill-none stroke-primary/15" strokeWidth="4" />
      <circle cx="22" cy="22" r={r}
              className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300"
              strokeWidth="4"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round" />
    </svg>
  );
}
