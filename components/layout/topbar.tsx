"use client";

import { Bell, LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SectionEyebrow } from "@/components/layout/section-eyebrow";
import { TopbarSearch } from "@/components/layout/topbar-search";
// Basic HR-policy chatbot drawer (US-45) — hidden from the UI while
// the analytics assistant at /analytics/ask is the primary AI surface.
// Re-enable by uncommenting the import + the <ChatDrawer /> mount
// below. All backing code (chat-drawer.tsx, /api/chat/*, chatbot
// services) is intentionally left intact for a fast future revival.
// import { ChatDrawer } from "@/components/chat/chat-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  user?: { name: string; email?: string; avatarUrl?: string };
  notifications?: number;
};

/**
 * Floats above the workspace canvas. Migrated to shadcn — search uses
 * <Input>, the user menu uses <DropdownMenu>, the notification bell uses
 * <Button variant="ghost">.
 */
export function Topbar({ user, notifications = 0 }: Props) {
  return (
    <div className="flex items-center gap-3 px-6 pt-3">
      <SectionEyebrow />

      <div className="ml-auto">
        <TopbarSearch />
      </div>

      {/* <ChatDrawer /> — hidden. See import block for revival notes. */}

      <ThemeToggle />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={
          notifications > 0
            ? `${notifications} unread notifications`
            : "Notifications"
        }
        className="relative h-8 w-8 rounded-md"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {notifications > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rise ring-2 ring-background" />
        )}
      </Button>

      {user && <UserMenu user={user} />}
    </div>
  );
}

function UserMenu({
  user,
}: {
  user: { name: string; email?: string; avatarUrl?: string };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 rounded-md pl-1 pr-2.5 hover:bg-muted"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} />
          <span className="hidden text-[13px] font-medium text-foreground sm:inline">
            {user.name.split(/\s+/)[0] || user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name}
            </p>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const dim = size === "lg" ? "h-10 w-10 text-sm" : "h-6 w-6 text-[10.5px]";
  return (
    <span
      className={cn(
        "grid place-items-center overflow-hidden rounded-full bg-primary/15 font-semibold text-primary",
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
