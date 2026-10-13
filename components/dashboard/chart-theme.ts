/**
 * Chart colour tokens that work in both light and dark mode.
 *
 * Recharts expects literal colour strings, not CSS variables, so
 * for the bar / line fills we hand it a BRAND NAVY (constant
 * across themes — the ink scale doesn't flip). For axes and
 * grid lines we return `currentColor`-ish literals that are
 * legible on either ground.
 *
 * Theme-sensitive strings (tick fill, grid line) can be pulled at
 * render time from CSS vars via the small helper below.
 */

export const CHART_NAVY = "#203060";      // brand primary — same in both themes
export const CHART_NAVY_SOFT = "#4C5F8E";  // ink-400 — second series / separations
export const CHART_MINT = "#88D0B8";      // brand accent — "gain" series
export const CHART_RED = "#EF4444";       // loss / separations

/** Axis + grid-line tints that work on both grounds. */
export const CHART_TICK_LIGHT = "#64748B"; // slate-500
export const CHART_TICK_DARK  = "#94A3B8"; // slate-400
export const CHART_GRID_LIGHT = "#E2E8F0"; // slate-200
export const CHART_GRID_DARK  = "#1E293B"; // slate-800

/**
 * Client-side helper: reads the current theme off the <html>
 * class and returns the right axis-tick + grid colours.
 * Falls back to the LIGHT values during SSR + the first client
 * paint — hydration-safe.
 */
export function readChartTheme(): { tick: string; grid: string } {
  if (typeof document === "undefined") {
    return { tick: CHART_TICK_LIGHT, grid: CHART_GRID_LIGHT };
  }
  const dark = document.documentElement.classList.contains("dark");
  return dark
    ? { tick: CHART_TICK_DARK, grid: CHART_GRID_DARK }
    : { tick: CHART_TICK_LIGHT, grid: CHART_GRID_LIGHT };
}
