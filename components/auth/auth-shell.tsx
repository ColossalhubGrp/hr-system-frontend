"use client";

import {
  BarChart3,
  Briefcase,
  Clock,
  Lock,
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

/** Chips that float around the brand panel. Each one bobs with the
 *  shared `auth-float` keyframe, offset by its own delay so the
 *  motion isn't synchronised. */
const FLOATING_CHIPS: Array<{
  label: string;
  /** Tailwind positioning utilities. */
  pos: string;
  /** Delay in ms; staggered to break the lockstep bob. */
  delay: number;
}> = [
  { label: "Payroll approved",       pos: "top-[18%] right-[8%]",   delay: 0 },
  { label: "Leave balance updated",  pos: "top-[42%] right-[16%]",  delay: 1200 },
  { label: "New applicant",          pos: "top-[62%] right-[6%]",   delay: 2400 },
  { label: "Appraisal signed",       pos: "top-[82%] right-[20%]",  delay: 3600 },
];

/** Marquee text — infinite horizontal strip of capability chips. */
const MARQUEE_LABELS = [
  "People", "Time", "Payroll", "Recruitment", "Performance",
  "Analytics", "Compliance", "Expenses", "Benefits", "Learning",
];

interface AuthShellProps {
  title: React.ReactNode;
  subtitle?: string;
  features?: MarketingFeature[];
  children: React.ReactNode;
}

/**
 * Shared split-screen auth layout used by /login, /register,
 * /forgot-password, /activate and /reset-password.
 *
 * The left brand panel borrows the Colossal Hub public site's own
 * animation vocabulary (float, flow, marquee, dot-grid) so a visitor
 * who clicks "Log in" from the marketing page lands on something
 * continuous with what they just left:
 *
 *   - three drifting gradient blobs (slow elliptical orbits)
 *   - a soft dot-grid overlay
 *   - four floating chips showing live activity ("Payroll approved",
 *     "Leave balance updated"…)
 *   - SVG hub-lines with the website's dashed-stroke flow animation
 *     connecting the chips to a central brand node
 *   - a marquee of capability labels along the bottom
 *
 * All motion is gated by `prefers-reduced-motion` via the keyframes
 * in globals.css — users who ask for stillness get a static panel.
 */
export function AuthShell({
  title,
  subtitle,
  features = DEFAULT_FEATURES,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Left: animated brand panel ─────────────────────────── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white md:flex">
        {/* Drifting gradient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="auth-blob-1 absolute -right-20 -top-24 h-80 w-80 rounded-full bg-ink-600 opacity-40 blur-3xl" />
          <div className="auth-blob-2 absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-ink-500 opacity-35 blur-3xl" />
          <div className="auth-blob-3 absolute top-1/3 left-1/3 h-72 w-72 rounded-full bg-ink-400 opacity-20 blur-3xl" />
        </div>

        {/* Dot grid overlay */}
        <div aria-hidden className="auth-dot-grid pointer-events-none absolute inset-0" />

        {/* Floating activity chips — right-aligned, out of the way
            of the title + feature list on the left. Hidden on
            narrower viewports so they don't crowd the text. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          {FLOATING_CHIPS.map((chip) => (
            <div
              key={chip.label}
              className={`auth-float absolute ${chip.pos}`}
              style={{ ["--auth-float-delay" as string]: `${chip.delay}ms` }}
            >
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md shadow-[0_4px_24px_rgba(30,58,138,0.25)]">
                <span className="h-1.5 w-1.5 rounded-full bg-rise" />
                <span className="text-[11px] font-medium text-white/85">{chip.label}</span>
              </div>
            </div>
          ))}
          {/* Dashed-stroke hub lines connecting the chips to a
              central node. Pure SVG, animated by the .auth-flow
              class (same technique the website uses on its hub
              illustration). */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.15" fill="none" className="auth-flow">
              <line x1="55" y1="55" x2="92" y2="18" />
              <line x1="55" y1="55" x2="84" y2="42" />
              <line x1="55" y1="55" x2="94" y2="62" />
              <line x1="55" y1="55" x2="80" y2="82" />
            </g>
            <circle cx="55" cy="55" r="0.9" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>

        {/* Content layer (above decorations) */}
        <div className="relative auth-fade-up">
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
            {features.map(({ icon: Icon, label, desc }, i) => (
              <li
                key={label}
                className="auth-fade-up flex gap-3"
                style={{ ["--auth-fade-delay" as string]: `${200 + i * 120}ms` }}
              >
                <span
                  className="auth-float flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20"
                  style={{ ["--auth-float-delay" as string]: `${i * 800}ms` }}
                >
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

        {/* Bottom cluster: marquee + security + footer */}
        <div className="relative space-y-4">
          {/* Marquee strip — infinite scroll of capability labels */}
          <div
            className="auth-marquee overflow-hidden"
            style={{
              maskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
            }}
            aria-hidden
          >
            <div className="auth-marquee-track flex w-max gap-3 whitespace-nowrap">
              {[...MARQUEE_LABELS, ...MARQUEE_LABELS].map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/60"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

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

      {/* ── Right: form, with a gentle fade-up entrance ────────── */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-10 md:w-1/2 md:py-16">
        <div className="auth-fade-up w-full max-w-sm">{children}</div>
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
