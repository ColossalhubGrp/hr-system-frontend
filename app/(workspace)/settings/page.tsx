import Link from "next/link";
import type { Route } from "next";
import {
  Settings,
  Users as UsersIcon,
  ShieldCheck,
  Building2,
  Target,
  Clock,
  Lock,
} from "lucide-react";
import { getMyAccess } from "@/lib/frappe/roles";

export const metadata = { title: "Settings · Colossal HR" };

type SettingCardSpec = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** Which access flag this card requires. Cards the user can't actually
   *  visit are NOT shown — locked-card variants aren't surfaced either, so
   *  the UI stays honest about what each persona can do. */
  show: (a: Awaited<ReturnType<typeof getMyAccess>>) => boolean;
};

const COMPANY_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/company",
    icon: <Building2 className="h-5 w-5" />,
    title: "Company profile",
    desc: "Legal name, address, currency, default holiday calendar — the values that the rest of HR + Payroll inherit.",
    show: (a) => a.isHrAdmin,
  },
];

const HR_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/performance",
    icon: <Target className="h-5 w-5" />,
    title: "Performance management",
    desc: "Default evaluation framework (KRA & Goals / OKR / Balanced Scorecard) — new cycles inherit it; HR can still override per cycle.",
    show: (a) => a.isHrAdmin,
  },
  {
    href: "/settings/overtime",
    icon: <Clock className="h-5 w-5" />,
    title: "Overtime rules",
    desc: "Define and assign overtime thresholds, calculation methods and effective dates — cascading from company → department → employee.",
    show: (a) => a.isHrAdmin,
  },
];

const IT_CARDS: SettingCardSpec[] = [
  {
    href: "/settings/users",
    icon: <UsersIcon className="h-5 w-5" />,
    title: "Users & Roles",
    desc: "Provision accounts, assign role bundles per the SRS persona list.",
    show: (a) => a.isItAdmin,
  },
  {
    href: "/settings/permissions",
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Permissions",
    desc: "Per-role DocPerm matrix — what each role can read, write, submit.",
    show: (a) => a.isItAdmin,
  },
];

export default async function SettingsHome() {
  const access = await getMyAccess();

  // Per the security model: filter cards BEFORE rendering. If a user can't
  // use a card, it doesn't appear — no greyed-out variants, no "click to
  // see why you can't have this" — the surface only shows what's available.
  const company = COMPANY_CARDS.filter((c) => c.show(access));
  const hr = HR_CARDS.filter((c) => c.show(access));
  const it = IT_CARDS.filter((c) => c.show(access));

  const totalVisible = company.length + hr.length + it.length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Workspace settings
        </h1>
        <p className="text-sm text-ash-600">
          Configuration that shapes the rest of the workspace. Each section
          requires a different role bundle — you're only seeing the cards your
          access lets you actually use.
        </p>
      </header>

      {totalVisible === 0 && (
        <p className="rounded-card border border-dashed border-hairline bg-canvas/50 px-6 py-10 text-center text-sm text-ash-600">
          <Lock className="mx-auto mb-2 h-4 w-4 text-ash-500" />
          Your roles don't currently include any settings administration.
          Ask an HR Director or IT Admin to grant the right role bundle.
        </p>
      )}

      {company.length > 0 && (
        <Section title="Company-wide" subtitle="Applies to the entire org">
          {company.map((c) => (
            <SettingCard key={c.href} {...c} />
          ))}
        </Section>
      )}

      {hr.length > 0 && (
        <Section
          title="HR policy"
          subtitle="Performance, time-off, overtime — set by HR leadership"
        >
          {hr.map((c) => (
            <SettingCard key={c.href} {...c} />
          ))}
        </Section>
      )}

      {it.length > 0 && (
        <Section
          title="IT administration"
          subtitle="Account, role and permission management"
        >
          {it.map((c) => (
            <SettingCard key={c.href} {...c} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ash-500">
          {title}
        </h2>
        <p className="text-[11px] text-ash-500">{subtitle}</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function SettingCard({
  href,
  icon,
  title,
  desc,
}: Omit<SettingCardSpec, "show">) {
  return (
    <Link
      href={href as Route}
      className="block rounded-card border border-hairline bg-surface p-5 shadow-card transition hover:border-ink-300 focus-ring"
    >
      <div className="mb-2 flex items-center gap-2 text-ink-800">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-ash-600">{desc}</p>
    </Link>
  );
}
