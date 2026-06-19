"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail, getStoredUserName } from "@/lib/recruitment/role-routing"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    BarChart3,
    Briefcase,
    CheckCircle2,
    MessageSquare,
    PieChart,
    Plus,
    Sparkles,
    TrendingUp,
    Upload,
    Users,
    Video,
} from "lucide-react"
import type { JobPosting, CandidateApplication } from "@/lib/recruitment/types"

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

export default function HrDashboardPage() {
    const router = useRouter()
    const [stats, setStats] = useState({
        totalJobs: 0,
        openJobs: 0,
        totalCandidates: 0,
        notReviewed: 0,
        totalReports: 0,
    })
    const [recentJobs, setRecentJobs] = useState<JobPosting[]>([])
    const [recentApps, setRecentApps] = useState<CandidateApplication[]>([])
    const [loading, setLoading] = useState(true)
    const userName = useMemo(() => getStoredUserName(), [])
    const userEmail = useMemo(() => getStoredUserEmail(), [])

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadStats()
    }, [router])

    const loadStats = async () => {
        try {
            const [jobs, candidates, reports] = await Promise.all([
                apiClient.getJobPostings(),
                apiClient.getCandidateApplications(),
                apiClient.getShortlistReports(),
            ])
            const jobList = jobs.data || []
            const candidateList = candidates.data || []
            setStats({
                totalJobs: jobs.total || jobList.length,
                openJobs: jobList.filter((j) => j.status === "Open").length,
                totalCandidates: candidates.total || candidateList.length,
                notReviewed: candidateList.filter((c) => c.shortlist_status === "Not Reviewed").length,
                totalReports: reports.total || (reports.data || []).length,
            })
            setRecentJobs(
                [...jobList]
                    .sort(
                        (a, b) =>
                            new Date(b.posted_date || 0).getTime() - new Date(a.posted_date || 0).getTime()
                    )
                    .slice(0, 4)
            )
            setRecentApps(
                [...candidateList]
                    .sort(
                        (a, b) =>
                            new Date(b.application_date || 0).getTime() -
                            new Date(a.application_date || 0).getTime()
                    )
                    .slice(0, 5)
            )
        } catch (error) {
            console.error("Failed to load stats:", error)
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

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-12">
                {/* Hero */}
                <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-5">
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                HR workspace
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-[#0A1128] sm:text-[28px]">
                                {greeting}{firstName ? `, ${firstName}` : ""}
                            </h1>
                            <p className="mt-1 text-sm text-[#525252]">
                                {stats.notReviewed > 0
                                    ? `You have ${stats.notReviewed} CV${stats.notReviewed === 1 ? "" : "s"} waiting on AI shortlisting.`
                                    : stats.totalCandidates > 0
                                        ? "Pipeline is healthy — every CV has been evaluated."
                                        : "Get started by creating a job posting and uploading CVs."}
                            </p>
                        </div>
                        <Button
                            asChild
                            className="flex-shrink-0 bg-[#034078] text-white hover:bg-[#0A1128]"
                        >
                            <Link href="/recruitment/hr/jobs?create=1">New job</Link>
                        </Button>
                    </div>
                </section>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        label="Job postings"
                        value={stats.totalJobs}
                        sub={`${stats.openJobs} open`}
                        icon={Briefcase}
                        tone="brand"
                        href="/recruitment/hr/jobs"
                    />
                    <StatTile
                        label="Candidates"
                        value={stats.totalCandidates}
                        sub="All applications"
                        icon={Users}
                        tone="violet"
                        href="/recruitment/candidates"
                    />
                    <StatTile
                        label="Awaiting review"
                        value={stats.notReviewed}
                        sub="AI shortlisting pending"
                        icon={Sparkles}
                        tone="amber"
                        href="/recruitment/candidates"
                    />
                    <StatTile
                        label="Reports"
                        value={stats.totalReports}
                        sub="Shortlist reports"
                        icon={PieChart}
                        tone="emerald"
                        href="/recruitment/reports"
                    />
                </div>

                {/* 2-col: actions + activity */}
                <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                    {/* Quick actions */}
                    <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[#0A1128]">Quick actions</h2>
                                <p className="text-xs text-[#525252]">Common HR tasks</p>
                            </div>
                            <TrendingUp className="h-4 w-4 text-[#A3A3A3]" />
                        </header>
                        <div className="grid gap-3 p-5 sm:grid-cols-2">
                            <ActionTile
                                icon={Plus}
                                title="Create job posting"
                                description="Open a new role and start collecting applications."
                                href="/recruitment/hr/jobs?create=1"
                                accent
                            />
                            <ActionTile
                                icon={Upload}
                                title="Upload CVs"
                                description="Add candidates and run AI shortlisting."
                                href="/recruitment/candidates/upload"
                            />
                            <ActionTile
                                icon={MessageSquare}
                                title="Open messages"
                                description="Reach out to candidates directly."
                                href="/recruitment/hr/messages"
                            />
                            <ActionTile
                                icon={Video}
                                title="Interview reviews"
                                description="Watch sessions and submit your assessments."
                                href="/recruitment/interviewsreview"
                            />
                            <ActionTile
                                icon={PieChart}
                                title="Shortlist reports"
                                description="Browse AI-ranked candidate batches."
                                href="/recruitment/reports"
                            />
                            <ActionTile
                                icon={BarChart3}
                                title="Wallet & billing"
                                description="Top up credits and review usage."
                                href="/recruitment/hr/billing"
                            />
                        </div>
                    </section>

                    {/* Activity */}
                    <aside className="space-y-5">
                        {/* Recent jobs */}
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                            <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0A1128]">Recent postings</h2>
                                    <p className="text-xs text-[#525252]">Newest jobs</p>
                                </div>
                                <Link
                                    href="/recruitment/hr/jobs"
                                    className="text-xs font-medium text-[#034078] hover:underline"
                                >
                                    All →
                                </Link>
                            </header>
                            {recentJobs.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-[#A3A3A3]">No job postings yet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#F0F0F0]">
                                    {recentJobs.map((j) => (
                                        <li key={j.name}>
                                            <Link
                                                href={`/recruitment/hr/jobs/${j.name}`}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB]"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[#0A1128]">{j.job_title}</p>
                                                    <p className="text-[10px] text-[#A3A3A3]">
                                                        {j.status} · {j.total_applications ?? 0} applicants
                                                    </p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Recent applications */}
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                            <header className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0A1128]">Recent applications</h2>
                                    <p className="text-xs text-[#525252]">Latest candidates</p>
                                </div>
                                <Link
                                    href="/recruitment/candidates"
                                    className="text-xs font-medium text-[#034078] hover:underline"
                                >
                                    All →
                                </Link>
                            </header>
                            {recentApps.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-[#A3A3A3]">No applications yet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#F0F0F0]">
                                    {recentApps.map((c) => (
                                        <li key={c.name}>
                                            <Link
                                                href={`/recruitment/candidates/profile/${encodeURIComponent(c.email || "unknown")}`}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB]"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[#0A1128]">
                                                        {c.candidate_name || "Unknown"}
                                                    </p>
                                                    <p className="truncate text-[10px] text-[#A3A3A3]">
                                                        {c.shortlist_status} · {c.job_title || "—"}
                                                    </p>
                                                </div>
                                                {c.shortlist_status === "Shortlisted" && (
                                                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </MainLayout>
    )
}
