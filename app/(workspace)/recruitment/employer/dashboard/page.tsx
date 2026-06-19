"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail, getStoredUserName } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    BarChart3,
    Building2,
    Check,
    CheckCircle2,
    CircleDashed,
    Sparkles,
    Users,
    Wallet,
} from "lucide-react"

// â”€â”€â”€ Bits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatTile({
    label,
    value,
    sub,
    icon: Icon,
    tone,
    href,
}: {
    label: string
    value: number | string
    sub?: string
    icon: React.ComponentType<{ className?: string }>
    tone: "brand" | "amber" | "emerald" | "violet" | "gray"
    href?: string
}) {
    const palette =
        tone === "brand"
            ? { fg: "#034078", bg: "#EFF6FF" }
            : tone === "amber"
                ? { fg: "#9A3412", bg: "#FFF7ED" }
                : tone === "emerald"
                    ? { fg: "#166534", bg: "#DCFCE7" }
                    : tone === "violet"
                        ? { fg: "#5B21B6", bg: "#F5F3FF" }
                        : { fg: "#525252", bg: "#F5F5F5" }
    const card = (
        <div className="group h-full rounded-xl border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
                <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: palette.bg, color: palette.fg }}
                >
                    <Icon className="h-3.5 w-3.5" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#0A1128]">{value}</p>
            {sub && (
                <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-[#A3A3A3]">{sub}</p>
                    {href && (
                        <ArrowRight className="h-3 w-3 text-[#A3A3A3] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    )}
                </div>
            )}
        </div>
    )
    return href ? (
        <Link href={href} className="block">
            {card}
        </Link>
    ) : (
        card
    )
}

function ActionTile({
    icon: Icon,
    title,
    description,
    href,
    accent,
}: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
    href: string
    accent?: boolean
}) {
    return (
        <Link
            href={href}
            className="group relative flex items-start gap-3 rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: accent ? "#BFDBFE" : "#E5E5E5" }}
        >
            <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={
                    accent
                        ? { background: "#034078", color: "#fff" }
                        : { background: "#EFF6FF", color: "#034078" }
                }
            >
                <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0A1128]">{title}</p>
                <p className="mt-0.5 text-xs text-[#525252]">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#034078]" />
        </Link>
    )
}

function getInitials(name?: string | null, email?: string | null): string {
    const source = name || (email ? email.split("@")[0] : null)
    if (!source) return "?"
    const parts = source.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ChecklistItem({
    done,
    title,
    description,
    href,
    cta,
}: {
    done: boolean
    title: string
    description: string
    href: string
    cta: string
}) {
    return (
        <li className="flex items-start gap-3 px-5 py-3.5">
            <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                style={
                    done
                        ? { background: "#DCFCE7", color: "#166534" }
                        : { background: "#F5F5F5", color: "#A3A3A3", border: "1px solid #E5E5E5" }
                }
            >
                {done ? <Check className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
            </span>
            <div className="flex-1 min-w-0">
                <p
                    className="text-sm font-semibold"
                    style={{ color: done ? "#166534" : "#0A1128" }}
                >
                    {title}
                </p>
                <p className="mt-0.5 text-xs text-[#525252]">{description}</p>
            </div>
            <Link
                href={href}
                className="flex-shrink-0 text-xs font-medium text-[#034078] hover:underline"
            >
                {done ? "Edit" : cta} →
            </Link>
        </li>
    )
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function EmployerDashboardPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const userName = useMemo(() => getStoredUserName(), [])
    // userCompany has no Frappe cookie counterpart; surface an empty string
    // and let the page render its "Company unknown" fallback.
    const userCompany = ""

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        teams: 0,
        hasProfile: false,
        hasBrandingStory: false,
    })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadDashboard()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const loadDashboard = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }
        try {
            const [profile, branding, teams] = await Promise.all([
                apiClient.getEmployerProfile(userEmail),
                apiClient.getEmployerBranding(userEmail),
                apiClient.getEmployerTeams(userEmail),
            ])
            setStats({
                teams: (teams.teams || []).length,
                hasProfile: Boolean(profile?.company_name || profile?.description),
                hasBrandingStory: Boolean(branding?.branding_story),
            })
        } catch (error) {
            console.error("Failed to load employer dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                </div>
            </MainLayout>
        )
    }

    const greeting =
        new Date().getHours() < 12
            ? "Good morning"
            : new Date().getHours() < 18
                ? "Good afternoon"
                : "Good evening"
    const firstName = userName?.split(" ")[0] || ""

    const completed = [stats.hasProfile, stats.hasBrandingStory, stats.teams > 0].filter(Boolean).length
    const totalSteps = 3
    const progressPct = Math.round((completed / totalSteps) * 100)

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-12">
                {/* Hero */}
                <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-5">
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Employer workspace
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-[#0A1128] sm:text-[28px]">
                                {greeting}{firstName ? `, ${firstName}` : ""}
                            </h1>
                            <p className="mt-1 text-sm text-[#525252]">
                                {completed === totalSteps
                                    ? "Your employer profile is fully set up — branded and ready for candidates."
                                    : `Setup is ${progressPct}% complete — finish a few more steps to put your best foot forward.`}
                            </p>
                        </div>
                        {completed < totalSteps && (
                            <Button
                                asChild
                                className="flex-shrink-0 bg-[#034078] text-white hover:bg-[#0A1128]"
                            >
                                <Link href="/recruitment/employer/profile" className="inline-flex items-center gap-1.5">
                                    Continue setup
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </div>
                    <div className="border-t border-[#E5E5E5] bg-[#F9FAFB] px-6 py-2.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-[#525252]">
                                Onboarding —{" "}
                                <span className="font-semibold text-[#0A1128]">
                                    {completed} / {totalSteps}
                                </span>
                            </span>
                            <span className="font-semibold text-[#0A1128] tabular-nums">{progressPct}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E5E5E5]">
                            <div
                                className="h-full rounded-full bg-[#034078]"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </section>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatTile
                        label="Teams"
                        value={stats.teams}
                        sub={stats.teams === 0 ? "None yet" : `Across the company`}
                        icon={Users}
                        tone="brand"
                        href="/recruitment/employer/teams"
                    />
                    <StatTile
                        label="Profile"
                        value={stats.hasProfile ? "Configured" : "Pending"}
                        sub={stats.hasProfile ? "Visible to candidates" : "Add company details"}
                        icon={Building2}
                        tone={stats.hasProfile ? "emerald" : "amber"}
                        href="/recruitment/employer/profile"
                    />
                    <StatTile
                        label="Brand story"
                        value={stats.hasBrandingStory ? "Available" : "Missing"}
                        sub={stats.hasBrandingStory ? "Boosts AI matching" : "Tell your story"}
                        icon={Sparkles}
                        tone={stats.hasBrandingStory ? "violet" : "amber"}
                        href="/recruitment/employer/branding"
                    />
                </div>

                {/* 2-col: actions + onboarding checklist */}
                <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                    <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[#0A1128]">Employer workspace</h2>
                                <p className="text-xs text-[#525252]">Manage how your company appears to candidates</p>
                            </div>
                        </header>
                        <div className="grid gap-3 p-5 sm:grid-cols-2">
                            <ActionTile
                                icon={Building2}
                                title="Employer profile"
                                description="Company name, description, and key details."
                                href="/recruitment/employer/profile"
                                accent={!stats.hasProfile}
                            />
                            <ActionTile
                                icon={Sparkles}
                                title="Branding & story"
                                description="Tell candidates what your company is about."
                                href="/recruitment/employer/branding"
                                accent={!stats.hasBrandingStory && stats.hasProfile}
                            />
                            <ActionTile
                                icon={Users}
                                title="Teams"
                                description="Group HR users by department or function."
                                href="/recruitment/employer/teams"
                            />
                            <ActionTile
                                icon={BarChart3}
                                title="Branding analytics"
                                description="Visibility, engagement, and reach."
                                href="/recruitment/employer/branding"
                            />
                            <ActionTile
                                icon={Wallet}
                                title="Wallet & billing"
                                description="Top up credits and review usage."
                                href="/recruitment/employer/billing"
                            />
                        </div>
                    </section>

                    <aside>
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                            <header className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0A1128]">Setup checklist</h2>
                                    <p className="text-xs text-[#525252]">{completed} of {totalSteps} complete</p>
                                </div>
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                                    style={
                                        completed === totalSteps
                                            ? { background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0" }
                                            : { background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA" }
                                    }
                                >
                                    {completed === totalSteps ? (
                                        <>
                                            <CheckCircle2 className="h-3 w-3" /> Done
                                        </>
                                    ) : (
                                        <>{progressPct}%</>
                                    )}
                                </span>
                            </header>
                            <ul className="divide-y divide-[#F0F0F0]">
                                <ChecklistItem
                                    done={stats.hasProfile}
                                    title="Complete company profile"
                                    description="Name, location, size, and what you do."
                                    href="/recruitment/employer/profile"
                                    cta="Set up"
                                />
                                <ChecklistItem
                                    done={stats.hasBrandingStory}
                                    title="Write your brand story"
                                    description="Why candidates should pick you over another offer."
                                    href="/recruitment/employer/branding"
                                    cta="Write"
                                />
                                <ChecklistItem
                                    done={stats.teams > 0}
                                    title="Add at least one team"
                                    description="Helps HR users self-organize and route candidates."
                                    href="/recruitment/employer/teams"
                                    cta="Add team"
                                />
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </MainLayout>
    )
}
