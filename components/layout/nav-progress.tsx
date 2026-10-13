"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top-of-viewport progress bar that gives INSTANT visual
 * feedback the moment the user clicks a nav link.
 *
 * How it works: we patch window.history.pushState so a click on a
 * `<Link href>` triggers us synchronously (fires before React
 * actually re-renders). The bar then animates from 0 → 80% quickly,
 * stays there while the server tree streams, then shoots to 100%
 * and fades out when `usePathname()` reports the new URL has
 * actually taken effect.
 *
 * Lives at the TOP of the workspace layout so the bar is pinned
 * across both the sidebar and the content area.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // "progress" is the width %, "visible" controls fade-in/out.
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const climbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Patch pushState / replaceState once so every <Link> click fires
  // a `nav-progress-start` custom event we listen for below.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      __navProgressPatched?: boolean;
    };
    if (w.__navProgressPatched) return;
    w.__navProgressPatched = true;

    const emit = () => window.dispatchEvent(new Event("nav-progress-start"));
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const ret = origPush.apply(this, args as Parameters<typeof origPush>);
      emit();
      return ret;
    };
    history.replaceState = function (...args) {
      const ret = origReplace.apply(this, args as Parameters<typeof origReplace>);
      emit();
      return ret;
    };
  }, []);

  // Start the bar when a navigation begins.
  useEffect(() => {
    const start = () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (climbTimer.current) clearTimeout(climbTimer.current);
      setVisible(true);
      setProgress(10);
      // Climb to ~80% over a few hundred ms so the bar visibly moves
      // even when the server round-trip is very fast. We stall at 80%
      // until the URL change pulse below carries us to 100%.
      climbTimer.current = setTimeout(() => setProgress(80), 150);
    };
    window.addEventListener("nav-progress-start", start);
    return () => window.removeEventListener("nav-progress-start", start);
  }, []);

  // Finish the bar when the URL actually changes.
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div
        className="h-full bg-ink-800"
        style={{
          width: `${progress}%`,
          transition: visible
            ? "width 300ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
        }}
      />
    </div>
  );
}
