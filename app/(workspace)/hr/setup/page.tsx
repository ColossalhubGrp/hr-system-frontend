import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  ClipboardList,
  Cog,
  MessageSquare,
  Receipt,
  Star,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "HR Setup · Colossal HR" };

type Card = {
  title: string;
  description: string;
  href: string;
  icon: typeof Cog;
  ready: boolean;
};

const CARDS: Card[] = [
  {
    title: "Feedback criteria",
    description:
      "Reusable criteria HR picks when scoring appraisal feedback. Ship criteria once, reference them everywhere.",
    href: "/hr/setup/feedback-criteria",
    icon: Star,
    ready: true,
  },
  {
    title: "Appraisal templates",
    description:
      "Rating criteria + weightages a cycle uses when it opens appraisals. Set them up so feedback forms auto-populate.",
    href: "/hr/setup/appraisal-templates",
    icon: ClipboardList,
    ready: false,
  },
  {
    title: "Modes of payment",
    description:
      "Wire Transfer / Cheque / Cash — set the default bank or cash account per company so 'Paid on filing' expense claims post cleanly.",
    href: "/hr/setup/modes-of-payment",
    icon: Wallet,
    ready: false,
  },
  {
    title: "Expense claim types",
    description:
      "Categories HR pick when filing expenses (Travel, Meals, Office…). Each with a default expense account per company.",
    href: "/hr/setup/expense-claim-types",
    icon: Receipt,
    ready: false,
  },
  {
    title: "Holiday lists",
    description: "Company holiday calendars used by leave + attendance.",
    href: "/hr/setup/holiday-lists",
    icon: BadgeCheck,
    ready: false,
  },
  {
    title: "Company defaults",
    description:
      "Default payable + expense claim + cost centre accounts on Company. Set once, feeds every downstream form.",
    href: "/hr/setup/company-defaults",
    icon: Banknote,
    ready: false,
  },
];

export default async function HrSetupPage() {
  const access = await getMyAccess();
  if (!(access?.isHrAdmin || access?.isItAdmin)) {
    redirect("/forbidden?need=HR_ADMIN&from=" + encodeURIComponent("/hr/setup"));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Cog}
        crumb="HR · Setup"
        title="HR Setup"
        subtitle="Reusable configuration for the whole HR module — set here, referenced everywhere."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const Wrapper: React.ComponentType<{
            children: React.ReactNode;
            className?: string;
          }> = card.ready
            ? (({ children, className }) => (
                <Link href={card.href as Route} className={className}>
                  {children}
                </Link>
              ))
            : (({ children, className }) => (
                <div className={className} aria-disabled title="Coming soon">
                  {children}
                </div>
              ));
          return (
            <Wrapper
              key={card.href}
              className={
                "group card flex flex-col gap-2 p-5 transition focus-ring " +
                (card.ready
                  ? "hover:border-ink-400 hover:shadow-rail cursor-pointer"
                  : "opacity-60")
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-ink-800">
                  <Icon className="h-4 w-4" />
                </div>
                {!card.ready && (
                  <span className="rounded-chip bg-canvas px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ash-500">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-ink-900">{card.title}</h3>
              <p className="text-sm text-ash-600">{card.description}</p>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
