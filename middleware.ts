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
];

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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)"],
};
