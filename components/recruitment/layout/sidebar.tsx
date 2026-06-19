"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
    BarChart3,
    Briefcase,
    CalendarDays,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    PieChart,
    Search,
    UserCircle2,
    Users,
    Video,
    Wallet as WalletIcon,
    X,
} from "lucide-react"
import { cn } from "@/lib/cn"
import { apiClient } from "@/lib/recruitment/api-client"
import { useAuthStore } from "@/lib/recruitment/store"
import { getCurrentAppRole } from "@/lib/recruitment/role-routing"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
// â”€â”€â”€ Nav definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { label: string; items: NavItem[] }

/**
 * Reads a non-HttpOnly Frappe cookie set by smart_hr_web's login. Frappe
 * URL-encodes values (e.g. `@` in emails), so we decode before returning.
 */
function readCookie(name: string): string {
    if (typeof document === "undefined") return ""
    const prefix = `${name}=`
    const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith(prefix))
        ?.slice(prefix.length)
    if (!raw || raw === "Guest") return ""
    // Decode up to twice — strips legacy double-encoded values from sessions
    // created before the loginAction fix landed, without breaking the new
    // single-encoded values.
    let current = raw
    for (let i = 0; i < 2; i++) {
        let next: string
        try {
            next = decodeURIComponent(current)
        } catch {
            break
        }
        if (next === current) break
        current = next
    }
    return current
}

const hrGroups: NavGroup[] = [
    {
        label: "Main",
        items: [{ href: "/recruitment/hr/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Hiring",
        items: [
            { href: "/recruitment/hr/jobs", label: "Job Postings", icon: Briefcase },
            { href: "/recruitment/candidates", label: "Candidates", icon: Users },
            { href: "/recruitment/reports", label: "Shortlist Reports", icon: PieChart },
            { href: "/recruitment/interviewsreview", label: "Interview Reviews", icon: Video },
        ],
    },
    {
        label: "Communication",
        items: [
            { href: "/recruitment/hr/messages", label: "Messages", icon: MessageSquare },
            { href: "/recruitment/feedback", label: "Feedback", icon: FileText },
        ],
    },
    {
        label: "Account",
        items: [{ href: "/recruitment/hr/billing", label: "Wallet & Billing", icon: WalletIcon }],
    },
]

const candidateGroups: NavGroup[] = [
    {
        label: "Main",
        items: [{ href: "/recruitment/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Job search",
        items: [
            { href: "/recruitment/candidate/jobs", label: "Jobs Discovery", icon: Search },
            { href: "/recruitment/candidate/applications", label: "My Applications", icon: FileText },
            { href: "/recruitment/candidate/interviews", label: "Interviews", icon: CalendarDays },
        ],
    },
    {
        label: "Personal",
        items: [
            { href: "/recruitment/candidate/profile", label: "My Profile", icon: UserCircle2 },
            { href: "/recruitment/candidate/messages", label: "Messages", icon: MessageSquare },
        ],
    },
]

const employerGroups: NavGroup[] = [
    {
        label: "Main",
        items: [{ href: "/recruitment/employer/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        label: "Company",
        items: [
            { href: "/recruitment/employer/profile", label: "Profile", icon: Briefcase },
            { href: "/recruitment/employer/teams", label: "Teams", icon: Users },
            { href: "/recruitment/employer/branding", label: "Branding & Analytics", icon: BarChart3 },
        ],
    },
    {
        label: "Account",
        items: [{ href: "/recruitment/employer/billing", label: "Wallet & Billing", icon: WalletIcon }],
    },
]

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getInitials(name?: string | null, email?: string | null): string {
    const source = name || (email ? email.split("@")[0] : null)
    if (!source) return "?"
    const parts = source.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isItemActive(pathname: string, href: string) {
    if (pathname === href) return true
    return pathname.startsWith(`${href}/`)
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const logout = useAuthStore((state) => state.logout)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const [user, setUser] = useState<{ name: string; email: string; role: string }>({
        name: "",
        email: "",
        role: "",
    })

    // Hydrate user info from the Frappe cookies smart_hr_web's login sets
    // (`user_id`, `full_name`). No sessionStorage / localStorage — those are
    // never written under the smart_hr_web auth path.
    useEffect(() => {
        const role = getCurrentAppRole() || ""
        const email = readCookie("user_id")
        const name = readCookie("full_name") || email
        setUser({ name, email, role })
    }, [pathname])

    const groups = useMemo<NavGroup[]>(() => {
        if (user.role === "candidate") return candidateGroups
        if (user.role === "employer") return employerGroups
        return hrGroups
    }, [user.role])

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await apiClient.logout()
            logout()
            setLogoutConfirmOpen(false)
            router.push("/")
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <>
            {/* Mobile menu trigger */}
            <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E5E5] bg-white shadow-sm hover:bg-[#F5F5F5] lg:hidden"
            >
                {mobileOpen ? <X className="h-5 w-5 text-[#0A1128]" /> : <Menu className="h-5 w-5 text-[#0A1128]" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#E5E5E5] bg-white transition-transform",
                    "lg:translate-x-0",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Brand */}
                <div className="flex items-center gap-3 border-b border-[#E5E5E5] px-5 py-4">
                    <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E5E5]"
                        aria-hidden="true"
                    >
                        <Image
                            src="/favicon-32x32.png"
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                            priority
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold leading-tight text-[#0A1128]">Colossal Hub</p>
                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-[#A3A3A3]">
                            AI-powered hiring
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-5">
                        {groups.map((group) => (
                            <li key={group.label}>
                                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                    {group.label}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const Icon = item.icon
                                        const active = isItemActive(pathname || "", item.href)
                                        return (
                                            <li key={item.href} className="relative">
                                                {active && (
                                                    <span
                                                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full"
                                                        style={{ background: "#034078" }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className={cn(
                                                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                                        active
                                                            ? "bg-[#EFF6FF] font-semibold text-[#034078]"
                                                            : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A1128]"
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            "h-4 w-4 flex-shrink-0 transition-colors",
                                                            active
                                                                ? "text-[#034078]"
                                                                : "text-[#A3A3A3] group-hover:text-[#525252]"
                                                        )}
                                                    />
                                                    <span className="truncate">{item.label}</span>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* User card */}
                <div className="border-t border-[#E5E5E5] p-3">
                    <div className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#0A1128]">
                                {user.name || (user.email ? user.email.split("@")[0] : "Account")}
                            </p>
                            <p className="truncate text-[11px] text-[#A3A3A3]">
                                {user.email || "—"}
                                {user.role && (
                                    <>
                                        {" · "}
                                        <span className="capitalize">{user.role}</span>
                                    </>
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLogoutConfirmOpen(true)}
                            aria-label="Sign out"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#A3A3A3] transition-colors hover:bg-white hover:text-red-600"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Log out of your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You&apos;ll need to sign in again to continue using the platform.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#034078] hover:bg-[#034078]/90 text-white"
                            onClick={(e) => {
                                e.preventDefault()
                                void handleLogout()
                            }}
                            disabled={loggingOut}
                        >
                            {loggingOut ? "Logging out…" : "Log out"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
