"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  NAV,
  NAV_GROUPS,
  GROUP_BY_ITEM,
  type NavItem,
  type NavGroupId,
} from "./nav-config";
import { BrandMark } from "./brand-mark";
import { cn } from "@/lib/cn";
import { appCodeForPath } from "@/lib/subscriptions/path";

export type AccessBundle = {
  isHrAdmin: boolean;
  isHrAny: boolean;
  isPayrollAdmin: boolean;
  isPayrollReviewer: boolean;
  isPayrollAny: boolean;
  isShiftAdmin: boolean;
  isLineManager: boolean;
  isRecruiter: boolean;
  isExecutiveViewer: boolean;
  isAuditor: boolean;
  isDataSteward: boolean;
  isItAdmin: boolean;
  isSettingsAny: boolean;
  isPlatformOperator: boolean;
  isEmployee: boolean;
  /** App codes the user's company is subscribed to. Set elements like
   *  "hr", "recruitment", "payroll". Always-on apps (core) live here too. */
  subscribedApps: Set<string>;
};

function canSee(
  requires: NavItem["requires"] | undefined,
  access: AccessBundle,
): boolean {
  if (!requires) return true; // public items — every signed-in user
  switch (requires) {
    case "HR_ADMIN":         return access.isHrAdmin;
    case "HR_ANY":           return access.isHrAny;
    case "PAYROLL_ADMIN":    return access.isPayrollAdmin;
    case "PAYROLL_REVIEWER": return access.isPayrollReviewer;
    case "PAYROLL_ANY":      return access.isPayrollAny;
    case "SHIFT_ADMIN":      return access.isShiftAdmin;
    case "LINE_MANAGER":     return access.isLineManager;
    case "RECRUITER":        return access.isRecruiter;
    case "EXECUTIVE_VIEWER": return access.isExecutiveViewer;
    case "AUDITOR":          return access.isAuditor;
    case "DATA_STEWARD":     return access.isDataSteward;
    case "IT_ADMIN":         return access.isItAdmin;
    case "SETTINGS_ANY":     return access.isSettingsAny;
    case "PLATFORM_OPERATOR":return access.isPlatformOperator;
    case "EMPLOYEE_ANY":     return access.isEmployee;
    case "ALUMNI_ONLY":      return false; // never in main sidebar
    default:                 return false;
  }
}

const COLLAPSED_KEY = "colossal.sidebar.collapsed";

/**
 * Purple rail. Items the signed-in user can't access are hidden;
 * a parent with no visible children is hidden too. On any nested route the
 * matching group auto-expands; the user can also toggle manually.
 *
 * Collapse: user can shrink the rail to a 64px icon-only strip via the
 * top-right toggle. Preference is persisted to localStorage so it
 * survives across page loads. In collapsed mode, groups behave as
 * plain-icon links to the parent's href — children hide entirely.
 */
export function Sidebar({ access }: { access: AccessBundle }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Decide whether a child nav link should be rendered as "active".
   *
   * We care about three families of child href:
   *   1. plain path          — `/accounting`, `/me`, `/employee`
   *   2. path + search param — `/accounting?s=reports`
   *   3. deep sibling path   — the user is on `/accounting/reports/trial-balance`
   *                            which belongs to the "Reports" tab even though
   *                            the href is `/accounting?s=reports`.
   *
   * Family 1 → strict equality (and no stray `s` param on the current URL).
   * Family 2 → compare search params; the one named on the href must match
   *            the current URL exactly (so Overview doesn't win when `s=reports`).
   * Family 3 → the child declares `matchPrefixes`; any pathname that starts
   *            with one of those prefixes activates it.
   */
  const isChildActive = (child: {
    href: string;
    matchPrefixes?: string[];
  }): boolean => {
    if (child.matchPrefixes?.some((p) => pathname.startsWith(p))) return true;

    const [childPath, childQuery = ""] = child.href.split("?");
    if (pathname !== childPath) return false;

    const childSP = new URLSearchParams(childQuery);
    const currentS = searchParams.get("s") ?? "";
    const expectedS = childSP.get("s") ?? "";
    return currentS === expectedS;
  };

  // Filter NAV by (a) role + (b) whether the user's company has
  // subscribed to the app the nav entry belongs to. Both must pass.
  const isSubscribed = (href: string): boolean => {
    const code = appCodeForPath(href);
    if (!code) return true; // unmapped routes (no gating) — always show
    return access.subscribedApps.has(code);
  };

  const visible: NavItem[] = useMemo(() => {
    return NAV.filter((item) => canSee(item.requires, access))
      .filter((item) => isSubscribed(item.href))
      .map((item) => {
        if (!item.children) return item;
        const kids = item.children
          .filter((c) => canSee(c.requires, access))
          .filter((c) => isSubscribed(c.href));
        if (kids.length === 0 && item.requires) return null; // collapse
        return { ...item, children: kids.length ? kids : undefined };
      })
      .filter((x): x is NavItem => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const item of visible) {
      if (item.children?.some((c) => pathname.startsWith(c.href))) {
        open.add(item.label);
      } else if (pathname.startsWith(item.href) && item.children) {
        open.add(item.label);
      }
    }
    return open;
  }, [pathname, visible]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initiallyOpen);
  // Collapsed state. Hydrate from localStorage on mount so SSR + client
  // agree on the initial (expanded) shape and the transition happens
  // after the first paint.
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, []);

  function toggle(label: string) {
    if (collapsed) return; // no sub-menu in collapsed mode
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        // Clean surface rail. A right-edge hairline keeps the rail
        // visually separate from the canvas (which is nearly the
        // same colour in light mode, and a different near-black in
        // dark mode). `bg-surface` + `text-ash-900` both flip in
        // dark mode so the sidebar inverts cleanly.
        "flex h-full flex-col gap-6 border-r border-hairline bg-surface text-ash-900 transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[244px]",
      )}
    >
      <div
        className={cn(
          "flex items-center pt-6",
          collapsed ? "justify-center px-2" : "gap-3 px-5",
        )}
      >
        <BrandMark className="h-9 w-9 shrink-0" />
        {!collapsed && (
          // Wordmark lockup — product name on top, tenant eyebrow
          // underneath. Mirrors the FCGS reference's two-line brand
          // treatment.
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[14px] font-bold tracking-tight text-ash-900">
              Colossal ERP
            </div>
            <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ash-500">
              Work operations
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-ash-500 transition hover:bg-canvas hover:text-ash-900 focus-ring",
            collapsed && "ml-0 mt-2",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Group visible items by their NAV_GROUPS id. Empty groups are
          elided so a role with no items in Operations (for example)
          doesn't see a lonely "Operations" header above a gap. */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto pb-4",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {NAV_GROUPS.map((group) => {
          const groupItems = visible.filter(
            (it) => (GROUP_BY_ITEM[it.label] ?? "workspace") === group.id,
          );
          if (groupItems.length === 0) return null;
          return (
            <section key={group.id} className={cn(collapsed ? "mt-3" : "mt-4 first:mt-0")}>
              {!collapsed && (
                <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ash-500">
                  {group.label}
                </div>
              )}
              {collapsed && (
                // Thin divider between groups in collapsed mode — keeps
                // the icon rail readable without a label.
                <div className="mx-2 mb-2 mt-1 h-px bg-hairline first:hidden" />
              )}
              <ul className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
          const Icon = item.icon;
          const isOpen = openGroups.has(item.label);
          const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

          return (
              <li key={item.label}>
                {item.children ? (
                  // Parent with children: the label part is a Link that
                  // navigates to the parent's href. The chevron is its
                  // own button that ONLY toggles the group — clicking
                  // the arrow never navigates. In collapsed rail mode
                  // the whole cell reverts to a plain icon-link since
                  // sub-navs aren't shown then.
                  collapsed ? (
                    <Link
                      href={item.href as never}
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-xl transition focus-ring",
                        isActive
                          ? "bg-ink-800 text-white"
                          : "text-ash-900 hover:bg-canvas",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px]",
                          isActive ? "text-white" : "text-ash-500",
                        )}
                      />
                    </Link>
                  ) : (
                    <div
                      className={cn(
                        "group flex w-full items-stretch rounded-xl text-[15px] font-medium transition",
                        isActive
                          ? "bg-ink-800 text-white"
                          : "text-ash-900 hover:bg-canvas",
                      )}
                    >
                      <Link
                        href={item.href as never}
                        className="flex flex-1 items-center gap-3 rounded-l-xl px-3 py-2.5 focus-ring"
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            isActive ? "text-white" : "text-ash-500",
                          )}
                        />
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggle(item.label)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        className={cn(
                          "flex w-10 items-center justify-center rounded-r-xl text-inherit focus-ring",
                          isActive ? "hover:bg-surface/10" : "hover:bg-canvas",
                        )}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen ? "rotate-90" : "",
                            isActive ? "text-white/80" : "text-ash-400",
                          )}
                        />
                      </button>
                    </div>
                  )
                ) : (
                  <Link
                    href={item.href as never}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center rounded-xl text-[15px] font-medium transition focus-ring",
                      collapsed
                        ? "h-11 justify-center px-0"
                        : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-ink-800 text-white"
                        : "text-ash-900 hover:bg-canvas",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-white" : "text-ash-500",
                      )}
                    />
                    {!collapsed && item.label}
                  </Link>
                )}

                {/* Sub-nav only renders when the rail is expanded. In
                    collapsed mode users navigate to the parent and
                    expand it inside the surface once they land. */}
                {!collapsed && item.children && isOpen && (
                  <ul className="ml-9 mt-1 flex flex-col gap-0.5 border-l border-hairline pl-3">
                    {item.children.map((child) => {
                      const childActive = isChildActive(child);
                      if (child.external) {
                        return (
                          <li key={child.href}>
                            <a
                              href={child.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] transition focus-ring",
                                "text-ash-500 hover:text-ash-900",
                              )}
                            >
                              {child.label}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          </li>
                        );
                      }
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href as never}
                            className={cn(
                              "flex w-full rounded-lg px-2 py-1.5 text-[13.5px] transition focus-ring",
                              childActive
                                ? "text-ash-900 font-semibold"
                                : "text-ash-500 hover:text-ash-900",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
              </ul>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
