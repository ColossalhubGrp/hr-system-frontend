import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate. Anything outside the (public) routes — login, static assets —
 * needs a `sid` cookie. Bare cookie presence is enough at the middleware
 * layer; Frappe enforces the real permission check on every API call we make.
 */
// Guest-allowed routes. Anything not listed here forces a redirect to
// /login (or /alumni/login for alumni paths). When you add a new auth page,
// add its path here too — otherwise the middleware will gate it.
const PUBLIC_PATHS = [
  "/login",
  "/alumni/login",
  "/register",
  "/forgot-password",
  "/activate",
  "/reset-password",
  "/update-password",
  "/api/auth",
  // Interview room — externally-invited candidates open the link from their
  // email and have no sid. The page itself is at /recruitment/interviews/
  // (deliberately outside the workspace shell so it doesn't require auth);
  // the LiveKit connection-details endpoint, the BFF for the interview
  // session methods (which are in GUEST_ALLOWED_POST_ENDPOINTS), and the
  // public job API are all hit during the flow, so they're all let through.
  "/recruitment/interviews",
  "/api/connection-details",
  "/api/frappe",
  "/api/public",
  "/api/recordings",
  // Phase 4b shared dashboard tiles — public token-authed reads.
  // The Next page (/analytics/shared/<token>) renders outside the
  // workspace shell; its API proxy (/api/analytics/shared/<token>)
  // hits a Frappe method whitelisted with allow_guest=True.
  // Middleware must let both through so anonymous browsers can
  // resolve the token without bouncing to /login.
  "/analytics/shared",
  "/api/analytics/shared",
];

// Idle timeout: no authenticated request for this long → signed out.
// Sliding window — any page view, server action or BFF call refreshes
// it via the `last_seen` cookie below. Frappe's own session_expiry is
// set to the same 10 minutes server-side, so the sid cookie also dies
// on the backend after the same inactivity.
const IDLE_LIMIT_SECONDS = 10 * 60;
const SESSION_COOKIES = ["sid", "user_id", "system_user", "full_name", "user_image", "last_seen"];

function clearSessionCookies(res: NextResponse) {
  const domain = process.env.COOKIE_DOMAIN;
  for (const name of SESSION_COOKIES) {
    res.cookies.delete(name);
    if (domain) {
      // Domain-scoped copies (cross-subdomain SSO) need the same
      // Domain attribute on deletion or the browser keeps them.
      res.cookies.set(name, "", { path: "/", domain, maxAge: 0 });
    }
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const sid = req.cookies.get("sid")?.value;
  if (!sid || sid === "Guest") {
    const url = req.nextUrl.clone();
    // Unauthenticated requests to /alumni/* go to the alumni-specific gate
    // so the user doesn't bounce between the two login pages.
    url.pathname = pathname.startsWith("/alumni") ? "/alumni/login" : "/login";
    if (pathname !== "/" && pathname !== "/dashboard") {
      url.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Signed in — enforce the inactivity window.
  const now = Math.floor(Date.now() / 1000);
  const lastSeen = Number(req.cookies.get("last_seen")?.value || 0);
  if (lastSeen && now - lastSeen > IDLE_LIMIT_SECONDS) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/alumni") ? "/alumni/login" : "/login";
    url.search = "";
    url.searchParams.set("timeout", "1");
    if (pathname !== "/" && pathname !== "/dashboard") {
      url.searchParams.set("redirect", pathname);
    }
    const res = NextResponse.redirect(url);
    clearSessionCookies(res);
    return res;
  }

  // Fresh activity (or a session from before this feature shipped —
  // grace rather than a mass-logout on deploy): slide the window.
  // NOTE: the cookie must OUTLIVE the idle window — if it expired with
  // it, a long-idle browser would come back looking "fresh". A day is
  // plenty; Frappe's server-side session_expiry is the backstop.
  const res = NextResponse.next();
  res.cookies.set("last_seen", String(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)"],
};
