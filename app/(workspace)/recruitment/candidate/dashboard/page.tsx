"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail, getStoredUserName } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    FileText,
    MessageSquare,
    Search,
    Sparkles,
    UserCircle2,
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
            <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-[#A3A3A3]">{sub}</p>
                {href && (
                    <ArrowRight className="h-3 w-3 text-[#A3A3A3] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
            </div>
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

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CandidateDashboardPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const userName = useMemo(() => getStoredUserName(), [])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalApplications: 0,
        shortlisted: 0,
        interviewsScheduled: 0,
        recommendedJobs: 0,
        rejected: 0,
    })
    const [wallet, setWallet] = useState<{ current_balance: number; status: string } | null>(null)
    const [upcoming, setUpcoming] = useState<any[]>([])

    const loadWallet = useCallback(async () => {
        try {
            const walletRes = await apiClient.apiCall<any>(
                "recruitment_app.api.billing_admin_api.get_wallet_summary",
                {}
            )
            setWallet(walletRes.message || walletRes)
        } catch {
            setWallet(null)
        }
    }, [])

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadDashboard()
        loadWallet()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const loadDashboard = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }
        try {
            const [applicationsResult, recommendationsResult, interviewsResult] = await Promise.allSettled([
                apiClient.candidateApplicationStatus(userEmail),
                apiClient.candidateAiJobRecommendations(userEmail, 8),
                apiClient.getCandidateInterviews(userEmail),
            ])
            const applications =
                applicationsResult.status === "fulfilled" ? applicationsResult.value : { applications: [] }
            const recommendations =
                recommendationsResult.status === "fulfilled" ? recommendationsResult.value : { recommended_jobs: [] }
            const interviews =
                interviewsResult.status === "fulfilled" ? interviewsResult.value : { interviews: [] }
            const applicationList = applications.applications || []
            const interviewList = interviews.interviews || []
            const shortlisted = applicationList.filter((a: any) =>
                ["Shortlisted", "Interview Scheduled", "Interviewed", "Offered", "Hired"].includes(a.shortlist_status)
            ).length
            const rejected = applicationList.filter((a: any) => a.shortlist_status === "Rejected").length
            const interviewsScheduled = interviewList.filter((i: any) => i.status === "Scheduled").length
            setStats({
                totalApplications: applicationList.length,
                shortlisted,
                interviewsScheduled,
                recommendedJobs: (recommendations.recommended_jobs || []).length,
                rejected,
            })
            setUpcoming(
                interviewList
                    .filter((i: any) => i.status === "Scheduled" || i.status === "In Progress")
                    .slice(0, 3)
            )
        } catch (error) {
            console.error("Failed to load candidate dashboard:", error)
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

    const heroLine = (() => {
        if (stats.interviewsScheduled > 0)
            return `You have ${stats.interviewsScheduled} interview${stats.interviewsScheduled === 1 ? "" : "s"} coming up.`
        if (stats.shortlisted > 0)
            return `${stats.shortlisted} application${stats.shortlisted === 1 ? " is" : "s are"} moving forward.`
        if (stats.recommendedJobs > 0)
            return `${stats.recommendedJobs} new job${stats.recommendedJobs === 1 ? "" : "s"} match your profile.`
        if (stats.totalApplications === 0)
            return "Welcome — explore open jobs and start applying."
        return "Keep exploring — recruiters are reviewing your applications."
    })()

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-12">
                {/* Hero */}
                <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-5">
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Candidate workspace
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-[#0A1128] sm:text-[28px]">
                                {greeting}{firstName ? `, ${firstName}` : ""}
                            </h1>
                            <p className="mt-1 text-sm text-[#525252]">{heroLine}</p>
                        </div>
                        <Button
                            asChild
                            className="flex-shrink-0 bg-[#034078] text-white hover:bg-[#0A1128]"
                        >
                            <Link href="/recruitment/candidate/jobs" className="inline-flex items-center gap-1.5">
                                <Search className="h-4 w-4" />
                                Browse jobs
                            </Link>
                        </Button>
                    </div>
                    {wallet && (
                        <div className="border-t border-[#E5E5E5] bg-[#F9FAFB] px-6 py-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 text-[#525252]">
                                    <Wallet className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                    Wallet balance
                                </span>
                                <span className="font-semibold text-[#0A1128] tabular-nums">
                                    {wallet.current_balance?.toLocaleString?.() ?? wallet.current_balance} credits
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        label="Applications"
                        value={stats.totalApplications}
                        sub="All submissions"
                        icon={FileText}
                        tone="brand"
                        href="/recruitment/candidate/applications"
                    />
                    <StatTile
                        label="Shortlisted"
                        value={stats.shortlisted}
                        sub="Moving forward"
                        icon={CheckCircle2}
                        tone="emerald"
                        href="/recruitment/candidate/applications"
                    />
                    <StatTile
                        label="Interviews"
                        value={stats.interviewsScheduled}
                        sub="Scheduled"
                        icon={CalendarDays}
                        tone="amber"
                        href="/recruitment/candidate/interviews"
                    />
                    <StatTile
                        label="Recommended"
                        value={stats.recommendedJobs}
                        sub="AI matches"
                        icon={Sparkles}
                        tone="violet"
                        href="/recruitment/candidate/jobs"
                    />
                </div>

                {/* 2-col: actions + upcoming */}
                <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                    <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[#0A1128]">Quick actions</h2>
                                <p className="text-xs text-[#525252]">Stay on top of your search</p>
                            </div>
                        </header>
                        <div className="grid gap-3 p-5 sm:grid-cols-2">
                            <ActionTile
                                icon={Search}
                                title="Browse jobs"
                                description="Discover new openings that match your skills."
                                href="/recruitment/candidate/jobs"
                                accent
                            />
                            <ActionTile
                                icon={Sparkles}
                                title="AI recommendations"
                                description="See roles ranked for you by the AI."
                                href="/recruitment/candidate/jobs"
                            />
                            <ActionTile
                                icon={UserCircle2}
                                title="Update profile"
                                description="Keep your CV, skills, and headline current."
                                href="/recruitment/candidate/profile"
                            />
                            <ActionTile
                                icon={FileText}
                                title="My applications"
                                description="Track every job you've applied for."
                                href="/recruitment/candidate/applications"
                            />
                            <ActionTile
                                icon={CalendarDays}
                                title="My interviews"
                                description="View upcoming and completed interview sessions."
                                href="/recruitment/candidate/interviews"
                            />
                            <ActionTile
                                icon={MessageSquare}
                                title="Messages"
                                description="Talk directly with recruiters."
                                href="/recruitment/candidate/messages"
                            />
                        </div>
                    </section>

                    <aside className="space-y-5">
                        {/* Upcoming interviews */}
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                            <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0A1128]">Upcoming interviews</h2>
                                    <p className="text-xs text-[#525252]">Don&apos;t miss these</p>
                                </div>
                                <Link
                                    href="/recruitment/candidate/interviews"
                                    className="text-xs font-medium text-[#034078] hover:underline"
                                >
                                    All →
                                </Link>
                            </header>
                            {upcoming.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-[#A3A3A3]">No interviews scheduled.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#F0F0F0]">
                                    {upcoming.map((iv) => (
                                        <li key={iv.name || iv.id}>
                                            <Link
                                                href="/recruitment/candidate/interviews"
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB]"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[#0A1128]">
                                                        {iv.job_posting || iv.name || "Interview"}
                                                    </p>
                                                    <p className="text-[10px] text-[#A3A3A3]">
                                                        {iv.scheduled_time
                                                            ? new Date(iv.scheduled_time).toLocaleString(undefined, {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })
                                                            : iv.status}
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Status summary */}
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                            <header className="border-b border-[#E5E5E5] px-4 py-3">
                                <h2 className="text-sm font-semibold text-[#0A1128]">Application status</h2>
                                <p className="text-xs text-[#525252]">Quick health check</p>
                            </header>
                            <ul className="divide-y divide-[#F0F0F0] text-sm">
                                <li className="flex items-center justify-between px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 text-[#525252]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#525252]" />
                                        Submitted
                                    </span>
                                    <span className="font-semibold tabular-nums text-[#0A1128]">{stats.totalApplications}</span>
                                </li>
                                <li className="flex items-center justify-between px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 text-[#166534]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Shortlisted
                                    </span>
                                    <span className="font-semibold tabular-nums text-[#0A1128]">{stats.shortlisted}</span>
                                </li>
                                <li className="flex items-center justify-between px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 text-[#9A3412]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        Interviews
                                    </span>
                                    <span className="font-semibold tabular-nums text-[#0A1128]">{stats.interviewsScheduled}</span>
                                </li>
                                <li className="flex items-center justify-between px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 text-[#991B1B]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        Rejected
                                    </span>
                                    <span className="font-semibold tabular-nums text-[#0A1128]">{stats.rejected}</span>
                                </li>
                            </ul>
                        </section>
                    </aside>
                </div>
            </div>
        </MainLayout>
    )
}
