"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { NAV } from "./nav-config";
import { BrandMark } from "./brand-mark";
import { cn } from "@/lib/cn";

/**
 * Fixed-width purple rail. On any HR-prefixed route the HR group expands
 * automatically; the user can also toggle a group manually.
 */
export function Sidebar() {
  const pathname = usePathname();

  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const item of NAV) {
      if (item.children?.some((c) => pathname.startsWith(c.href))) {
        open.add(item.label);
      } else if (pathname.startsWith(item.href) && item.children) {
        open.add(item.label);
      }
    }
    return open;
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initiallyOpen);

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  return (
    <aside className="flex h-full w-[244px] flex-col gap-6 bg-ink-800 text-white shadow-rail">
      <div className="flex items-center gap-3 px-6 pt-7">
        <BrandMark className="h-10 w-10" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isOpen = openGroups.has(item.label);
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.label}>
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    className={cn(
                      "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition focus-ring",
                      isActive
                        ? "bg-white text-ink-800"
                        : "text-white/85 hover:bg-white/[0.06]",
                    )}
                    aria-expanded={isOpen}
                  >
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
                  </button>
                ) : (
                  <Link
                    href={item.href as never}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition focus-ring",
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
                    {item.label}
                  </Link>
                )}

                {item.children && isOpen && (
                  <ul className="ml-9 mt-1 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      // External children open in a new tab — used today for
                      // Recruitment which lives on a separate domain.
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
