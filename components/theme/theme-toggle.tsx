"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

/**
 * Sun / moon pill for the topbar. Clicking flips between the two
 * explicit themes (`light` ↔ `dark`); the first click on a visitor
 * who was on `system` locks their choice.
 *
 * We render whichever icon represents the OTHER theme (sun when
 * dark is active, moon when light is active) — the common
 * "click to switch to…" affordance.
 */
export function ThemeToggle() {
  const { effective, toggle } = useTheme();
  const next = effective === "dark" ? "light" : "dark";
  const Icon = effective === "dark" ? Sun : Moon;
  const label = `Switch to ${next} theme`;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card transition hover:text-foreground focus-ring"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
