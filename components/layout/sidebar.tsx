"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV, type NavItem } from "./nav-config";
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
        "flex h-full flex-col gap-6 bg-ink-800 text-white shadow-rail transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[244px]",
      )}
    >
      <div
        className={cn(
          "flex items-center pt-7",
          collapsed ? "justify-center px-2" : "gap-3 px-6",
        )}
      >
        <BrandMark className="h-10 w-10 shrink-0" />
        {/* Toggle: pushed to the right when expanded; below the brand
            when collapsed so it stays reachable. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white focus-ring",
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

      <nav
        className={cn(
          "flex-1 overflow-y-auto pb-4",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <ul className="flex flex-col gap-1">
          {visible.map((item) => {
            const Icon = item.icon;
            const isOpen = openGroups.has(item.label);
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.label}>
                {item.children ? (
                  // Parent with children: the label is a real Link so the
                  // parent's href navigates; clicking it ALSO expands the
                  // children (when not collapsed). Chevron is a hint.
                  <Link
                    href={item.href as never}
                    onClick={() => toggle(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex w-full items-center rounded-xl text-[15px] font-medium transition focus-ring",
                      collapsed
                        ? "h-11 justify-center px-0"
                        : "justify-between gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-white text-ink-800"
                        : "text-white/85 hover:bg-white/[0.06]",
                    )}
                    aria-expanded={!collapsed && isOpen}
                    aria-label={collapsed ? item.label : undefined}
                  >
                    {collapsed ? (
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px]",
                          isActive ? "text-ink-700" : "text-white/85",
                        )}
                      />
                    ) : (
                      <>
                        <span className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px]",
                              isActive ? "text-ink-700" : "text-white/85",
                            )}
                          />
                          {item.label}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition",
                            isOpen ? "rotate-90" : "",
                            isActive ? "text-ink-700" : "text-white/60",
                          )}
                        />
                      </>
                    )}
                  </Link>
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
                        ? "bg-white text-ink-800"
                        : "text-white/85 hover:bg-white/[0.06]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-ink-700" : "text-white/85",
                      )}
                    />
                    {!collapsed && item.label}
                  </Link>
                )}

                {/* Sub-nav only renders when the rail is expanded. In
                    collapsed mode users navigate to the parent and
                    expand it inside the surface once they land. */}
                {!collapsed && item.children && isOpen && (
                  <ul className="ml-9 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      if (child.external) {
                        return (
                          <li key={child.href}>
                            <a
                              href={child.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] transition focus-ring",
                                "text-white/65 hover:text-white",
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
                                ? "text-white font-semibold"
                                : "text-white/65 hover:text-white",
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
      </nav>
    </aside>
  );
}
