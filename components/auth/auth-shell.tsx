"use client";

import { Lock } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";

interface AuthShellProps {
  /** Kept in the type for backwards compat with /register / /forgot-
   *  password callers; the simplified layout doesn't render it. */
  title?: React.ReactNode;
  /** Same — unused but accepted so callers don't need to be rewritten. */
  subtitle?: string;
  /** Also kept for compat; the feature list panel was removed. */
  features?: unknown;
  children: React.ReactNode;
}

/**
 * Clean, single-column auth layout.
 *
 * Shared by /login, /register, /forgot-password, /activate and
 * /reset-password. The earlier split-screen with the animated brand
 * panel was removed on 2026-10-07 at the user's request — a Linear-
 * style centered card reads calmer and lets the form breathe.
 *
 * Props `title`, `subtitle` and `features` are accepted but ignored
 * so the call sites don't need to be rewritten — they'll silently
 * no-op on this layout. The brand lockup is the only header; each
 * page provides its own heading / subcopy inside `children`.
 */
/**
 * Legacy export — pages used to render this inline for a mobile-only
 * brand lockup. The new AuthShell always shows the brand at the top,
 * so AuthBrandMark would duplicate it. Kept as a no-op so existing
 * `<AuthBrandMark />` calls across /login, /register, /forgot-password,
 * /activate and /reset-password don't error — removing them in a
 * follow-up sweep.
 */
export function AuthBrandMark(_: { subtitle?: string } = {}) {
  return null;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Brand lockup — top-left on wide screens, centered on narrow. */}
      <header className="w-full px-6 pt-8 md:px-10 md:pt-10">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9 ring-1 ring-hairline" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Colossal HR
          </span>
        </div>
      </header>

      {/* Form sits in the vertical centre of the remaining space. */}
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="auth-fade-up w-full max-w-sm">{children}</div>
      </main>

      {/* Minimal footer — security line + copyright, muted. */}
      <footer className="px-6 pb-6 text-xs text-muted-foreground md:px-10 md:pb-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Your data is encrypted in transit and at rest.
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} Colossal HR. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Common password input with an eye/eye-off toggle on the right. Kept as a
 * client component so the visibility state stays local without per-page
 * useState boilerplate. Visual style matches shadcn's Input chrome.
 */
export { PasswordInput } from "./password-input";
