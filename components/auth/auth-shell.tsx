"use client";

import {
  BarChart3,
  Briefcase,
  Clock,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

interface MarketingFeature {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}

const DEFAULT_FEATURES: MarketingFeature[] = [
  { icon: Users, label: "Unified people record", desc: "One source of truth across employees, contractors, and alumni." },
  { icon: Clock, label: "Time & attendance", desc: "Shifts, leave, overtime — payroll-ready, with manager approvals." },
  { icon: BarChart3, label: "Performance & analytics", desc: "Cycles, calibration, and live dashboards across the workforce." },
  { icon: Briefcase, label: "Recruitment", desc: "Jobs, AI shortlisting, and structured interviews — built in." },
];

interface AuthShellProps {
  title: React.ReactNode;
  subtitle?: string;
  features?: MarketingFeature[];
  children: React.ReactNode;
}

/**
 * Shared split-screen auth layout used by /login, /register,
 * /forgot-password, /activate and /reset-password. Mirrors the structure of
 * the recruitment app's auth-shell so the experience is consistent across
 * the unified workspace, with smart_hr_web's ink-800 brand purple replacing
 * recruitment's blue.
 */
export function AuthShell({
  title,
  subtitle,
  features = DEFAULT_FEATURES,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left — brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-800 p-12 text-white md:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ink-600 opacity-30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-rise opacity-20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="mb-12 flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <p className="text-sm font-semibold uppercase tracking-widest text-ink-50/80">
              Colossal HR
            </p>
          </div>

          <h2 className="text-[34px] font-bold leading-tight">{title}</h2>
          {subtitle && (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              {subtitle}
            </p>
          )}

          <ul className="mt-10 space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4 text-ink-50" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <Lock className="h-3.5 w-3.5 text-ink-50" />
            <p className="text-[11px] text-white/70">
              Your data is encrypted in transit and at rest.
            </p>
          </div>
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} Colossal HR. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-10 md:w-1/2 md:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

/**
 * Compact brand mark rendered above the form on small screens (where the
 * marketing panel is hidden). Mirrors recruitment's AuthBrandMark.
 */
export function AuthBrandMark({
  subtitle = "People · Time · Pay · Recruit",
}: {
  subtitle?: string;
}) {
  return (
    <div className="mb-8 md:hidden">
      <div className="flex items-center gap-2.5">
        <BrandMark className="h-10 w-10 ring-1 ring-hairline" />
        <div>
          <p className="text-base font-bold leading-tight text-ink-900">
            Colossal HR
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Common password input with an eye/eye-off toggle on the right. Kept as a
 * client component so the visibility state stays local without per-page
 * useState boilerplate. Visual style matches shadcn's Input chrome.
 */
export { PasswordInput } from "./password-input";
