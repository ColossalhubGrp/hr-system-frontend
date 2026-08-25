/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // typedRoutes is disabled because the verbatim recruitment-app port
    // builds Link hrefs from dynamic template literals (e.g.
    // `/recruitment/jobs/${id}`), which the typed-routes generator
    // rejects without per-call `as Route` casts. We keep runtime routing
    // intact; this only relaxes the compile-time RouteImpl<T> guard.
    typedRoutes: false,

    // Client-side Router Cache TTLs. Next 14.2 defaults `dynamic` to 0
    // seconds — meaning every back-nav to a previously-visited page
    // (Attendance list, Leaves list, Employee directory, …) refetches
    // from scratch. Every workspace page is auto-dynamic because
    // frappeCookieHeader() reads cookies() during render, so this
    // default is what makes revisits feel slow.
    //
    // Router Cache is per-browser and keyed by the client's own
    // session — no cross-user leak possible. Mutations already call
    // revalidatePath so post-edit navigations bust the cache
    // deterministically for the acting user; the 60s TTL is a
    // hard fallback in case a mutation elsewhere is missed.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },

  /**
   * Backwards-compat redirects for old standalone-recruitment-app URLs.
   * The recruitment app used to serve everything from /jobs, /hr/jobs,
   * /candidates, etc. The integrated copy lives under /recruitment/*.
   * Any deep link / bookmark / external email link pointing at the old
   * shape transparently forwards to the new home — without these every
   * legacy URL would 404 because smart_hr_web has no /jobs route, and
   * its /hr is the leave-management module not the recruitment one.
   *
   * Marked `permanent: false` (308) so consumers can still update their
   * links; flip to true once everything external has caught up.
   */
  async redirects() {
    return [
      // Top-level recruitment surfaces
      { source: "/jobs", destination: "/recruitment/jobs", permanent: false },
      { source: "/jobs/:path*", destination: "/recruitment/jobs/:path*", permanent: false },
      { source: "/candidates", destination: "/recruitment/candidates", permanent: false },
      { source: "/candidates/:path*", destination: "/recruitment/candidates/:path*", permanent: false },
      { source: "/candidate", destination: "/recruitment/candidate", permanent: false },
      { source: "/candidate/:path*", destination: "/recruitment/candidate/:path*", permanent: false },
      { source: "/employer", destination: "/recruitment/employer", permanent: false },
      { source: "/employer/:path*", destination: "/recruitment/employer/:path*", permanent: false },
      { source: "/reports", destination: "/recruitment/reports", permanent: false },
      { source: "/reports/:path*", destination: "/recruitment/reports/:path*", permanent: false },
      { source: "/interviews/:path*", destination: "/recruitment/interviews/:path*", permanent: false },
      { source: "/interviewsreview", destination: "/recruitment/interviewsreview", permanent: false },
      { source: "/interviewsreview/:path*", destination: "/recruitment/interviewsreview/:path*", permanent: false },
      { source: "/interviewreports", destination: "/recruitment/interviewreports", permanent: false },
      { source: "/feedback", destination: "/recruitment/feedback", permanent: false },
      { source: "/billing", destination: "/recruitment/billing", permanent: false },
      { source: "/billing/:path*", destination: "/recruitment/billing/:path*", permanent: false },

      // Recruitment-app-scoped /hr/* — must NOT clobber smart_hr_web's own
      // /hr/leaves, /hr/attendance, /hr/training, /hr/performance,
      // /hr/expense-claims, /hr/shift-management routes. Enumerate just the
      // recruitment-only sub-paths so the rest fall through untouched.
      { source: "/hr/jobs", destination: "/recruitment/hr/jobs", permanent: false },
      { source: "/hr/jobs/:path*", destination: "/recruitment/hr/jobs/:path*", permanent: false },
      { source: "/hr/dashboard", destination: "/recruitment/hr/dashboard", permanent: false },
      { source: "/hr/messages", destination: "/recruitment/hr/messages", permanent: false },
      { source: "/hr/billing", destination: "/recruitment/hr/billing", permanent: false },
      { source: "/hr/billing/:path*", destination: "/recruitment/hr/billing/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
