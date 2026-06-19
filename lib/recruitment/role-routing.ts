export type AppRole = "hr" | "candidate" | "employer"

const toRoleToken = (value: string) => value.trim().toLowerCase()

const parseAppRole = (value?: string | null): AppRole | null => {
    if (!value) return null
    const normalized = toRoleToken(value)
    if (normalized.includes("candidate")) return "candidate"
    if (normalized === "employer" || normalized === "external hiring company") return "employer"
    if (normalized.includes("hr") || normalized === "recruiter" || normalized === "hiring manager") {
        return "hr"
    }
    return null
}

// ---------------------------------------------------------------------------
// Single source of truth: the Frappe `user_id` cookie that smart_hr_web's
// sid-based login sets. No sessionStorage / localStorage / app_role reads.
// Those were leftovers from the recruitment-app standalone auth and would
// mask the real signed-in state inside smart_hr_web.
//
// Server-side authorization always runs through Frappe (sid + role checks via
// `recruitment_app.api.me.my_roles`); the helpers below are client-only UX
// hints, used for sidebar branding and choosing the initial dashboard path.
// ---------------------------------------------------------------------------

const readUserIdCookie = (): string => {
    if (typeof document === "undefined") return ""
    const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith("user_id="))
        ?.slice("user_id=".length)
    if (!raw || raw === "Guest") return ""
    return safeDecode(raw)
}

/**
 * decodeURIComponent up to twice, stopping when stable. Strips legacy
 * double-encoded Frappe values (`HR%2520Director`) without breaking the
 * new single-encoded ones written by smart_hr_web's fixed login.
 */
const safeDecode = (input: string): string => {
    let current = input
    for (let i = 0; i < 2; i++) {
        let next: string
        try {
            next = decodeURIComponent(current)
        } catch {
            return current
        }
        if (next === current) return current
        current = next
    }
    return current
}

export const getStoredUserEmail = (): string => readUserIdCookie()

const readNonHttpOnlyCookie = (name: string): string => {
    if (typeof document === "undefined") return ""
    const prefix = `${name}=`
    const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith(prefix))
        ?.slice(prefix.length)
    if (!raw || raw === "Guest") return ""
    return safeDecode(raw)
}

/** Frappe's full_name cookie set by smart_hr_web's login. */
export const getStoredUserName = (): string => readNonHttpOnlyCookie("full_name")

// We no longer cache the raw Frappe role list on the client. Components that
// previously used it (sidebar branding, post-login dashboard pick) fall back
// to `hr` — which is the right default inside smart_hr_web where every
// recruitment-route visitor has already cleared the RECRUITER gate.
export const getStoredRoles = (): string[] => []

/**
 * Used by main-layout.tsx as a hint before the server-side check completes.
 * Cookie presence is enough: smart_hr_web's login sets `user_id` only after
 * Frappe accepted the sid, and the middleware re-checks sid on every request.
 */
export const hasActiveSessionCookie = (): boolean => {
    return readUserIdCookie() !== ""
}

export const getStoredAppRole = (): AppRole | null => {
    // The recruitment-app standalone wrote an `app_role` cookie at login;
    // smart_hr_web doesn't. We always return null and let callers fall back
    // to the `hr` default via `resolvePrimaryRole`.
    return null
}

export const resolvePrimaryRole = (roles: string[]): AppRole => {
    const normalized = roles.map(toRoleToken)
    if (normalized.some((role) => role.includes("candidate"))) return "candidate"
    if (normalized.some((role) => role === "employer" || role === "external hiring company")) {
        return "employer"
    }
    return "hr"
}

export const getDashboardPathForRole = (role: AppRole) => {
    switch (role) {
        case "candidate":
            return "/recruitment/candidate/dashboard"
        case "employer":
            return "/recruitment/employer/dashboard"
        default:
            return "/recruitment/hr/dashboard"
    }
}

export const getDefaultDashboardPath = () => {
    const role = getStoredAppRole() || resolvePrimaryRole(getStoredRoles())
    return getDashboardPathForRole(role)
}

export const getCurrentAppRole = (): AppRole => {
    return getStoredAppRole() || resolvePrimaryRole(getStoredRoles())
}

export const roleAllowedPrefixes: Record<AppRole, string[]> = {
    hr: [
        "/recruitment/hr",
        "/recruitment/jobs",
        "/recruitment/candidates",
        "/recruitment/reports",
        "/recruitment/interviews",
        "/recruitment/interviewsreview",
        "/recruitment/interviewreports",
        "/recruitment/feedback",
        "/recruitment/billing",
        "/dashboard",
    ],
    candidate: ["/recruitment/candidate", "/dashboard"],
    employer: ["/recruitment/employer", "/dashboard"],
}

export const isPathAllowedForRole = (pathname: string, role: AppRole) => {
    const allowedPrefixes = roleAllowedPrefixes[role] || []
    return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export const resolveRoleFromHints = (hints: Array<string | undefined | null>): AppRole => {
    const normalized = hints
        .filter(Boolean)
        .map((value) => toRoleToken(String(value)))

    if (normalized.some((value) => value.includes("candidate"))) return "candidate"
    if (normalized.some((value) => value === "employer" || value === "external hiring company")) {
        return "employer"
    }
    return "hr"
}
