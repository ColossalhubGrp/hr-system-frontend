import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ClipboardList,
  Settings2,
  Star,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ModuleSetupGrid, type SetupCard } from "@/components/settings/module-setup-grid";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Performance setup · Colossal HR" };

const CARDS: SetupCard[] = [
  {
    href: "/settings/performance",
    icon: <Target className="h-4 w-4" />,
    title: "Evaluation framework",
    desc: "Default evaluation framework (KRA & Goals / OKR / Balanced Scorecard). New cycles inherit it; HR can still override per cycle.",
  },
  {
    href: "/settings/feedback-criteria",
    icon: <Star className="h-4 w-4" />,
    title: "Feedback criteria",
    desc: "Reusable criteria HR picks when scoring appraisal feedback (Communication, Ownership, Technical delivery…).",
  },
  {
    href: "/settings/appraisal-templates",
    icon: <ClipboardList className="h-4 w-4" />,
    title: "Appraisal templates",
    desc: "Rating criteria + weightages a cycle uses to open appraisals. Set once — every new appraisal + its feedback forms inherit them.",
  },
];

export default async function PerformanceSetupPage() {
  const access = await getMyAccess();
  if (!access.isHrAdmin && !access.isItAdmin) {
    redirect(
      "/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/hr/performance/setup"),
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={"/hr/performance" as Route}
        className="inline-flex w-fit items-center gap-1 rounded-chip px-2 py-1 text-xs font-medium text-ash-500 transition hover:bg-canvas focus-ring"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to performance
      </Link>
      <PageHeader
        icon={Settings2}
        crumb="HR · Performance · Setup"
        title="Performance setup"
        subtitle="Framework, feedback criteria and appraisal templates. New cycles and appraisals inherit whatever you configure here."
      />
      <ModuleSetupGrid cards={CARDS} />
    </div>
  );
}
