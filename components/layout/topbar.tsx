"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/cn";

type Props = {
  user?: { name: string; email?: string; avatarUrl?: string };
  notifications?: number;
};

/**
 * Floats above the workspace canvas. The search pill is a controlled input wired
 * to nothing yet — global search is a Phase 2 feature (SRS §6.1.2). Bell shows a
 * dot when unread > 0; user menu collapses to the avatar on narrow viewports.
 */
export function Topbar({ user, notifications = 0 }: Props) {
  return (
    <div className="flex items-center justify-end gap-4 px-6 pt-5">
      <label className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
        <input
          type="search"
          placeholder="Search"
          className="h-10 w-[280px] rounded-chip border border-hairline bg-surface pl-9 pr-4 text-sm placeholder:text-ash-500 focus-ring"
        />
      </label>

      <button
        type="button"
        aria-label={
          notifications > 0
            ? `${notifications} unread notifications`
            : "Notifications"
        }
        className="relative grid h-10 w-10 place-items-center rounded-full bg-surface shadow-card focus-ring"
      >
        <Bell className="h-4 w-4 text-ash-700" />
        {notifications > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rise ring-2 ring-surface" />
        )}
      </button>

      {user && <UserMenu user={user} />}
    </div>
  );
}

function UserMenu({
  user,
}: {
  user: { name: string; email?: string; avatarUrl?: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 shadow-card focus-ring"
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} />
        <span className="hidden text-sm font-medium text-ash-900 sm:inline">
          {user.name}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ash-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-rail"
        >
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ash-900">
                {user.name}
              </p>
              {user.email && (
                <p className="truncate text-xs text-ash-500">{user.email}</p>
              )}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ash-800 transition hover:bg-canvas focus-ring"
            >
              <LogOut className="h-4 w-4 text-ash-500" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "grid place-items-center overflow-hidden rounded-full bg-ink-100 font-semibold text-ink-700",
        dim,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
