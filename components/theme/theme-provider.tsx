"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Three states, not two: `system` lets the OS decide and tracks
 * `prefers-color-scheme` live, while `light` / `dark` are explicit
 * user choices that persist across visits via localStorage.
 */
export type ThemeChoice = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

const STORAGE_KEY = "colossal.theme";

type ThemeContextValue = {
  /** Raw stored preference — what the UI should show as "selected". */
  choice: ThemeChoice;
  /** Which theme is currently applied to the document. */
  effective: EffectiveTheme;
  setChoice: (choice: ThemeChoice) => void;
  /** Convenience for the topbar sun/moon pill — flips between
   *  the two explicit values. Discards `system` on first toggle. */
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function osPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* localStorage unavailable — fall through to system */
  }
  return "system";
}

function applyEffective(effective: EffectiveTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", effective === "dark");
  // Keep the native color-scheme in sync so native form controls
  // (date pickers, scrollbars on non-webkit) render correctly.
  root.style.colorScheme = effective;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Hydration-safe: start with whatever the no-flash script in
  // layout.tsx stamped onto <html>. We read it back on mount so
  // SSR and the first client render agree.
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [effective, setEffective] = useState<EffectiveTheme>("light");

  useEffect(() => {
    const stored = readStoredChoice();
    const eff: EffectiveTheme =
      stored === "system" ? (osPrefersDark() ? "dark" : "light") : stored;
    setChoiceState(stored);
    setEffective(eff);
    applyEffective(eff);
  }, []);

  // When the user has `system` selected, follow OS theme changes
  // live. Explicit light/dark users don't move with the OS.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const eff: EffectiveTheme = mq.matches ? "dark" : "light";
      setEffective(eff);
      applyEffective(eff);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    const eff: EffectiveTheme =
      next === "system" ? (osPrefersDark() ? "dark" : "light") : next;
    setEffective(eff);
    applyEffective(eff);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const toggle = useCallback(() => {
    setChoice(effective === "dark" ? "light" : "dark");
  }, [effective, setChoice]);

  return (
    <ThemeContext.Provider value={{ choice, effective, setChoice, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

/**
 * Inline no-flash script. Runs synchronously BEFORE React mounts,
 * so <html> already carries the correct `dark` class and
 * color-scheme by the time the first paint happens — no light →
 * dark flicker on dark-mode visits.
 *
 * Rendered via <script dangerouslySetInnerHTML> in app/layout.tsx.
 */
export const NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (dark) root.classList.add('dark');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* no-op — localStorage blocked in private mode etc. */
  }
})();
`;
