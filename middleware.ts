import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate. Anything outside the (public) routes — login, static assets —
 * needs a `sid` cookie. Bare cookie presence is enough at the middleware
 * layer; Frappe enforces the real permission check on every API call we make.
 */
const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const sid = req.cookies.get("sid")?.value;
  if (!sid || sid === "Guest") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
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
