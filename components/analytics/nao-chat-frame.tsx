"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { publicEnv } from "@/lib/env";

/**
 * Full-height iframe embed of the nao chat runtime under
 * hr.colossalhub.com/analytics/ask. Cross-subdomain session cookies
 * (Domain=.colossalhub.com) let the iframe authenticate silently —
 * users never see the nao-rivers.colossalhub.com URL.
 *
 * Notes on layout: the workspace layout wraps this in
 * ``<main className="flex-1 overflow-y-auto px-6 pb-8 pt-4">`` which
 * would leave nao's UI inside a padded box. The negative margins
 * below unwind that so the chat renders edge-to-edge, matching what
 * users see when opening nao standalone.
 *
 * If NEXT_PUBLIC_NAO_EMBED_URL is unset (local dev, environments
 * without nao provisioned) we render a static "not configured"
 * placeholder rather than a broken iframe.
 */
export function NaoChatFrame({
  naoPath = "/",
}: {
  /** Which nao route to land on inside the iframe. Defaults to `/`
   *  (new chat / home). Callers pass `/stories` or `/feed` to iframe
   *  those surfaces; the outer Colossal sidebar exposes each as its
   *  own nav item so users navigate through the host chrome, not the
   *  nao inner rail (which is fully hidden in embed mode). */
  naoPath?: string;
} = {}) {
  const embedOrigin = publicEnv.NEXT_PUBLIC_NAO_EMBED_URL;
  // Always route the initial iframe load through the SSO bootstrap so
  // the sidecar auto-provisions (or re-signs-in) the current Frappe
  // user before nao's own SPA gets to check the session. Otherwise
  // nao's client-side auth check runs first, sees no session (cookies
  // not yet set for iframe context), and renders its own login form —
  // the /login nginx interceptor doesn't fire because SPA routing is
  // in-page, not a real navigation.
  // `?embed=1` on the target triggers nao's Colossal-embed chrome
  // overrides (see `main.tsx` on the colossal-embed branch): hides
  // duplicate sidebar, "Latest story" panel, input-row extras, and
  // fully hides the inner sidebar so nao is pure content. The mode
  // is persisted in sessionStorage inside nao so any client-side
  // nav there keeps the overrides active without the query string.
  //
  // Path assembly: append `?embed=1` (or `&embed=1` if the caller's
  // path already has a query). URL-encode the whole thing so
  // sso_bridge's `_safe_target` sees a single opaque string.
  const embedUrl = embedOrigin
    ? (() => {
        const sep = naoPath.includes("?") ? "&" : "?";
        const naoTarget = `${naoPath}${sep}embed=1`;
        return new URL(
          "/_sso/bootstrap?target=" + encodeURIComponent(naoTarget),
          embedOrigin,
        ).toString();
      })()
    : undefined;
  const [status, setStatus] = useState<"loading" | "loaded" | "blocked">(
    embedUrl ? "loading" : "blocked",
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!embedUrl) return;
    // If the browser refuses to render the frame (X-Frame-Options /
    // CSP frame-ancestors mismatch), `onLoad` never fires. Fall back
    // after 12s so the user sees a real error instead of an eternal
    // spinner.
    const t = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "blocked" : prev));
    }, 12_000);
    return () => clearTimeout(t);
  }, [embedUrl]);

  return (
    <div className="relative -mx-6 -mt-4 -mb-8 h-[calc(100dvh-3.5rem)] overflow-hidden bg-canvas">
      {embedUrl && (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Analytics chat"
          className="h-full w-full border-0"
          onLoad={() => setStatus("loaded")}
          // Clipboard for the copy-to-share buttons nao renders;
          // microphone for its voice-input feature.
          allow="clipboard-read; clipboard-write; microphone"
        />
      )}
      {status !== "loaded" && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas">
          {status === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-ash-600">
              <Loader2 className="h-8 w-8 animate-spin text-ink-600" />
              <p className="text-sm">Loading analytics chat…</p>
            </div>
          ) : (
            <div className="max-w-md rounded-card border border-hairline bg-surface p-6 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-fall" />
              <p className="mb-1 text-sm font-semibold text-ink-900">
                Analytics chat isn&rsquo;t available right now
              </p>
              <p className="text-xs text-ash-600">
                {embedUrl
                  ? "The chat service didn't respond in time, or your browser blocked the embed. Try refreshing; if the problem persists, ping IT."
                  : "The chat runtime URL isn't configured for this environment. Ask your admin to set NEXT_PUBLIC_NAO_EMBED_URL."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
