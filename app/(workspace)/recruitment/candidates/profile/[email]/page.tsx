"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Briefcase,
    CheckCircle2,
    Download,
    FileText,
    Mail,
    Phone,
    Star,
    Video,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
    const source = name || (email ? email.split("@")[0] : null)
    if (!source) return "?"
    const parts = source
        .replace(/[._-]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRelative(date?: string | null): string {
    if (!date) return "—"
    const d = new Date(String(date).replace(" ", "T"))
    if (Number.isNaN(d.getTime())) return "—"
    const diffMs = Date.now() - d.getTime()
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 1) return "just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.round(diffH / 24)
    if (diffD < 7) return `${diffD}d ago`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const STATUS_TONES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    "Not Reviewed": { dot: "#A3A3A3", text: "#525252", bg: "#F5F5F5", border: "#E5E5E5" },
    Shortlisted: { dot: "#1282A2", text: "#034078", bg: "#EFF6FF", border: "#BFDBFE" },
    "Interview Scheduled": { dot: "#F97316", text: "#9A3412", bg: "#FFF7ED", border: "#FED7AA" },
    Interviewed: { dot: "#7C3AED", text: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" },
    Offered: { dot: "#28C76F", text: "#166534", bg: "#DCFCE7", border: "#BBF7D0" },
    Hired: { dot: "#28C76F", text: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
    Rejected: { dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
}

function StatusPill({ status }: { status?: string | null }) {
    const tone = (status && STATUS_TONES[status]) || STATUS_TONES["Not Reviewed"]
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
            style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
            {status || "Not Reviewed"}
        </span>
    )
}

function ScoreBadge({ score }: { score?: number | null }) {
    if (score == null) return <span className="text-sm text-[#A3A3A3]">—</span>
    const tone =
        score >= 80
            ? { text: "#166534", bg: "#DCFCE7" }
            : score >= 60
                ? { text: "#034078", bg: "#EFF6FF" }
                : score >= 40
                    ? { text: "#9A3412", bg: "#FFF7ED" }
                    : { text: "#991B1B", bg: "#FEF2F2" }
    return (
        <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
            style={{ background: tone.bg, color: tone.text }}
        >
            <Star className="h-3 w-3 fill-current" />
            {score.toFixed(1)}
        </span>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage() {
    const params = useParams()
    const router = useRouter()
    const email = params.email as string
    const decodedEmail = decodeURIComponent(email)

    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProfile()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [decodedEmail])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const result = await apiClient.getCandidateProfile(decodedEmail)
            if (result?.success) {
                setProfile(result)
            } else {
                setError(result?.error || "Failed to load candidate profile")
            }
        } catch (err) {
            console.error("Error loading profile:", err)
            setError("Error loading candidate profile")
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

    if (error || !profile) {
        return (
            <MainLayout>
                <div className="mx-auto max-w-4xl">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-700">Couldn&apos;t load candidate</p>
                            <p className="mt-1 text-sm text-red-700/80">{error || "Profile not found."}</p>
                        </div>
                    </div>
                </div>
            </MainLayout>
        )
    }

    const candidate = profile.candidate
    const applications: any[] = profile.applications || []

    // Stats
    const totalApps = applications.length
    const shortlistedCount = applications.filter((a) =>
        ["Shortlisted", "Interview Scheduled", "Interviewed", "Offered", "Hired"].includes(a.shortlist_status)
    ).length
    const interviewCount = applications.reduce(
        (sum, a) => sum + (a.interview_sessions?.length || 0),
        0
    )
    const avgScore = (() => {
        const valid = applications
            .map((a) => (typeof a.ai_score === "number" ? a.ai_score : null))
            .filter((v): v is number => v != null)
        if (valid.length === 0) return null
        return valid.reduce((s, n) => s + n, 0) / valid.length
    })()

    // Sort applications: most recent first
    const sortedApps = [...applications].sort((a, b) => {
        const at = new Date(a.application_date || 0).getTime()
        const bt = new Date(b.application_date || 0).getTime()
        return bt - at
    })

    return (
        <MainLayout>
            <div className="mx-auto max-w-5xl space-y-6 pb-20">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/recruitment/candidates"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Candidates
                    </Link>
                </div>

                {/* Hero */}
                <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Candidate</p>
                            <h1 className="mt-1 text-2xl font-bold text-[#0A1128] sm:text-3xl truncate">
                                {candidate?.candidate_name || "Unknown"}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#525252]">
                                {candidate?.email && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                        <span className="break-all">{candidate.email}</span>
                                    </span>
                                )}
                                {candidate?.phone && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                        {candidate.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        {candidate?.cv_attachment && (
                            <a
                                href={`https://api.colossalhub.com/${candidate.cv_attachment}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#034078] px-3.5 py-2 text-sm font-medium text-[#034078] transition-colors hover:bg-[#034078] hover:text-white"
                            >
                                <Download className="h-4 w-4" />
                                Download CV
                            </a>
                        )}
                    </div>
                </section>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        label="Applications"
                        value={totalApps}
                        icon={Briefcase}
                        tone="brand"
                    />
                    <StatTile
                        label="Shortlisted"
                        value={shortlistedCount}
                        icon={CheckCircle2}
                        tone="emerald"
                    />
                    <StatTile
                        label="Interviews"
                        value={interviewCount}
                        icon={Video}
                        tone="amber"
                    />
                    <StatTile
                        label="Avg AI score"
                        value={avgScore == null ? "—" : avgScore.toFixed(1)}
                        icon={Award}
                        tone="gray"
                    />
                </div>

                {/* Applications */}
                <section className="space-y-4">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-lg font-semibold text-[#0A1128]">
                            Applications
                            <span className="ml-2 text-sm font-normal text-[#A3A3A3]">{totalApps}</span>
                        </h2>
                    </div>

                    {sortedApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                            <p className="mt-1 text-sm font-semibold text-[#0A1128]">No applications yet</p>
                            <p className="max-w-sm text-xs text-[#A3A3A3]">
                                When this candidate applies to a job, the application will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                            <div className="hidden grid-cols-[2fr_140px_120px_140px_110px_80px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
                                <div>Job</div>
                                <div>Status</div>
                                <div>AI score</div>
                                <div>Applied</div>
                                <div>Interviews</div>
                                <div className="text-right">
                                    <span className="sr-only">Action</span>
                                </div>
                            </div>
                            <ul className="divide-y divide-[#F0F0F0]">
                                {sortedApps.map((app: any) => {
                                    const interviews = app.interview_sessions || []
                                    const interviewCount = interviews.length
                                    return (
                                        <li
                                            key={app.application_id}
                                            className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[2fr_140px_120px_140px_110px_80px] lg:items-center lg:gap-4"
                                        >
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/recruitment/candidates/application/${app.application_id}`}
                                                    className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                                                >
                                                    {app.job_details?.job_title || "Application"}
                                                </Link>
                                            </div>
                                            <div className="text-sm">
                                                <StatusPill status={app.shortlist_status} />
                                            </div>
                                            <div className="text-sm">
                                                <ScoreBadge score={app.ai_score} />
                                            </div>
                                            <div className="text-sm text-[#525252]">
                                                {app.application_date
                                                    ? new Date(app.application_date).toLocaleDateString(undefined, {
                                                          month: "short",
                                                          day: "numeric",
                                                          year: "numeric",
                                                      })
                                                    : "—"}
                                            </div>
                                            <div className="text-sm tabular-nums text-[#525252]">
                                                {interviewCount > 0 ? (
                                                    <span className="font-semibold text-[#0A1128]">{interviewCount}</span>
                                                ) : (
                                                    <span className="text-[#A3A3A3]">—</span>
                                                )}
                                            </div>
                                            <div className="text-sm font-medium lg:text-right">
                                                <Link
                                                    href={`/recruitment/candidates/application/${app.application_id}`}
                                                    className="font-semibold text-[#034078] hover:text-[#0A1128]"
                                                >
                                                    Open
                                                    <span className="sr-only">, {app.job_details?.job_title || "application"}</span>
                                                </Link>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </section>

                {!candidate?.cv_attachment && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#A3A3A3]">
                            <FileText className="h-4 w-4" />
                        </span>
                        <p className="text-sm text-[#525252]">
                            No CV attached on file for this candidate.
                        </p>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}

function StatTile({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string
    value: number | string
    icon: React.ComponentType<{ className?: string }>
    tone: "brand" | "amber" | "emerald" | "gray"
}) {
    const palette =
        tone === "brand"
            ? { fg: "#034078", bg: "#EFF6FF" }
            : tone === "amber"
                ? { fg: "#9A3412", bg: "#FFF7ED" }
                : tone === "emerald"
                    ? { fg: "#166534", bg: "#DCFCE7" }
                    : { fg: "#525252", bg: "#F5F5F5" }
    return (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
                <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: palette.bg, color: palette.fg }}
                >
                    <Icon className="h-3.5 w-3.5" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0A1128]">{value}</p>
        </div>
    )
}
