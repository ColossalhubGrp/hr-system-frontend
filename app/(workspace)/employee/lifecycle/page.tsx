import Link from "next/link";
import type { Route } from "next";
import {
  ChevronRight,
  GitBranch,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  TrendingUp,
  MessageSquareWarning,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { fetchLifecycleSummary, type LifecycleKind } from "@/lib/frappe/lifecycle";

export const metadata = { title: "Employee Lifecycle · Colossal HR" };

const KIND_META: Record<
  LifecycleKind,
  { label: string; icon: typeof UserPlus; blurb: string }
> = {
  onboarding: {
    label: "Onboarding",
    icon: UserPlus,
    blurb: "Welcome runs, paperwork, first-week tasks.",
  },
  separation: {
    label: "Separation",
    icon: UserMinus,
    blurb: "Exit interviews, asset handover, final settlement.",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowRightLeft,
    blurb: "Cross-department or cross-company moves.",
  },
  promotion: {
    label: "Promotion",
    icon: TrendingUp,
    blurb: "Pay-grade and designation changes.",
  },
  grievance: {
    label: "Grievance",
    icon: MessageSquareWarning,
    blurb: "Raised concerns and their investigation trail.",
  },
};

const ORDER: LifecycleKind[] = [
  "onboarding",
  "separation",
  "transfer",
  "promotion",
  "grievance",
];

export default async function LifecycleHubPage() {
  const summary = await fetchLifecycleSummary();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={GitBranch}
        crumb="Employee · Lifecycle"
        title="Employee lifecycle"
        subtitle="Onboarding through separation — every transition the workforce goes through."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((k) => {
          const m = KIND_META[k];
          const s = summary[k];
          const Icon = m.icon;
          return (
            <Link
              key={k}
              href={`/employee/lifecycle/${k}` as Route}
              className="group rounded-card focus-ring"
            >
              <article className="card flex h-full flex-col gap-4 p-5 transition group-hover:border-ink-100">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-50/60 text-ink-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {m.label}
                      </p>
                      <p className="text-xs text-ash-500">{m.blurb}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ash-400" />
                </header>
                <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ash-500">
                      Total
                    </p>
                    <p className="text-2xl font-semibold text-ink-900">
                      {s.total.toLocaleString()}
                    </p>
                  </div>
                  {s.latest && (
                    <div className="min-w-0 text-right">
                      <p className="text-xs uppercase tracking-wide text-ash-500">
                        Latest
                      </p>
                      <p className="truncate text-sm font-medium text-ash-900">
                        {s.latest.employeeName ?? s.latest.employee}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
