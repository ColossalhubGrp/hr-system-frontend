"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    ExternalLink,
    RefreshCw,
    Sparkles,
    UserCircle2,
    Video,
    XCircle,
} from "lucide-react"
import type { CandidateInterview } from "@/lib/recruitment/types"

type StatusTone = {
    bg: string
    text: string
    border: string
    dot: string
    label: string
}

function statusTone(status?: string): StatusTone {
    const key = (status || "").toLowerCase()
    switch (key) {
        case "scheduled":
            return {
                bg: "bg-amber-50",
                text: "text-amber-700",
                border: "border-amber-200",
                dot: "bg-amber-500",
                label: "Scheduled",
            }
        case "in progress":
            return {
                bg: "bg-[#EFF6FF]",
                text: "text-[#034078]",
                border: "border-[#034078]/20",
                dot: "bg-[#034078]",
                label: "In progress",
            }
        case "completed":
            return {
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
                dot: "bg-emerald-500",
                label: "Completed",
            }
        case "cancelled":
            return {
                bg: "bg-red-50",
                text: "text-red-700",
                border: "border-red-200",
                dot: "bg-red-500",
                label: "Cancelled",
            }
        default:
            return {
                bg: "bg-[#F5F5F5]",
                text: "text-[#525252]",
                border: "border-[#E5E5E5]",
                dot: "bg-[#A3A3A3]",
                label: status || "Unknown",
            }
    }
}

const toDateTime = (value?: string) => {
    if (!value) return "—"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

const toScore = (interview: CandidateInterview) => {
    const candidates = [
        interview.score,
        interview.interview_score,
        interview.overall_score,
        interview.final_score,
    ]
    for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) return value
        if (typeof value === "string" && value.trim()) {
            const parsed = Number(value)
            if (Number.isFinite(parsed)) return parsed
        }
    }
    return null
}

const toAiComment = (interview: CandidateInterview) => {
    const candidates = [
        interview.ai_feedback,
        interview.ai_comment,
        interview.ai_comments,
        interview.summary,
        interview.final_ai_evaluation,
    ]
    for (const value of candidates) {
        if (typeof value === "string" && value.trim()) return value.trim()
        if (value && typeof value === "object") {
            const maybeSummary = (value as any).summary
            if (typeof maybeSummary === "string" && maybeSummary.trim()) return maybeSummary.trim()
        }
    }
    return ""
}

function StatTile({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    accent: string
}) {
    return (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                {label}
            </p>
            <p className="mt-1 truncate text-2xl font-bold text-[#0A1128]">{value}</p>
        </div>
    )
}

export default function CandidateInterviewsPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [loading, setLoading] = useState(true)
    const [interviews, setInterviews] = useState<CandidateInterview[]>([])

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        loadInterviews()
    }, [router])

    const loadInterviews = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const response = await apiClient.getCandidateInterviews(userEmail)
            setInterviews(response.interviews || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load interviews")
        } finally {
            setLoading(false)
        }
    }

    const counts = useMemo(() => {
        const total = interviews.length
        const scheduled = interviews.filter(
            (i) => (i.status || "").toLowerCase() === "scheduled",
        ).length
        const completed = interviews.filter(
            (i) => (i.status || "").toLowerCase() === "completed",
        ).length
        const cancelled = interviews.filter(
            (i) => (i.status || "").toLowerCase() === "cancelled",
        ).length
        return { total, scheduled, completed, cancelled }
    }, [interviews])

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-40 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#034078] border-t-transparent" />
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                            Schedule
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            Your interviews
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Upcoming, in-progress, and completed AI-led interviews — with feedback when available.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadInterviews}
                        className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        icon={Video}
                        label="Total"
                        value={counts.total}
                        accent="#034078"
                    />
                    <StatTile
                        icon={Clock}
                        label="Scheduled"
                        value={counts.scheduled}
                        accent="#D97706"
                    />
                    <StatTile
                        icon={CheckCircle2}
                        label="Completed"
                        value={counts.completed}
                        accent="#28C76F"
                    />
                    <StatTile
                        icon={XCircle}
                        label="Cancelled"
                        value={counts.cancelled}
                        accent="#B91C1C"
                    />
                </div>

                {/* List */}
                {interviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
                        <span
                            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-[#A3A3A3]"
                            style={{ background: "#F5F5F5" }}
                            aria-hidden="true"
                        >
                            <Video className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-semibold text-[#0A1128]">No interviews yet</p>
                        <p className="mt-1 text-xs text-[#525252]">
                            When a recruiter schedules an interview, it&apos;ll appear here with a join link.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {interviews.map((interview) => {
                            const tone = statusTone(interview.status)
                            const score = toScore(interview)
                            const aiComment = toAiComment(interview)
                            return (
                                <div
                                    key={interview.name}
                                    className="rounded-2xl border border-[#E5E5E5] bg-white p-5"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="min-w-0 flex-1 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="truncate text-base font-semibold text-[#0A1128]">
                                                    {interview.job_title || "Interview"}
                                                </p>
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                                                        aria-hidden="true"
                                                    />
                                                    {tone.label}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-[#525252] sm:grid-cols-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <UserCircle2 className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                                    <span className="font-medium text-[#171717]">Recruiter:</span>
                                                    <span className="truncate">{interview.recruiter || "—"}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                                    <span className="font-medium text-[#171717]">Scheduled:</span>
                                                    <span>{toDateTime(interview.scheduled_time)}</span>
                                                </span>
                                                {score != null && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Sparkles className="h-3.5 w-3.5 text-[#1282A2]" />
                                                        <span className="font-medium text-[#171717]">Score:</span>
                                                        <span className="font-semibold text-[#1282A2]">{score}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {aiComment && (
                                                <div className="rounded-xl border border-[#E5E5E5] bg-[#F9FAFB] p-3">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                                        AI feedback
                                                    </p>
                                                    <p className="mt-1 text-sm leading-relaxed text-[#525252]">
                                                        {aiComment}
                                                    </p>
                                                </div>
                                            )}

                                            {interview.interview_link && (
                                                <a
                                                    href={interview.interview_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#034078] hover:underline"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Join interview
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
