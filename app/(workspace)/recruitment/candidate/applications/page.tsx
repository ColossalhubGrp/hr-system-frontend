"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import {
    AlertCircle,
    ArrowRight,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    Clock,
    FileText,
    Sparkles,
    XCircle,
} from "lucide-react"
import type { CandidateApplication } from "@/lib/recruitment/types"
import Link from "next/link"

type StatusTone = {
    bg: string
    text: string
    border: string
    dot: string
    label: string
}

function statusTone(status?: string): StatusTone {
    switch (status) {
        case "Shortlisted":
            return {
                bg: "bg-[#EFF6FF]",
                text: "text-[#034078]",
                border: "border-[#034078]/20",
                dot: "bg-[#034078]",
                label: "Shortlisted",
            }
        case "Interview Scheduled":
            return {
                bg: "bg-amber-50",
                text: "text-amber-700",
                border: "border-amber-200",
                dot: "bg-amber-500",
                label: "Interview scheduled",
            }
        case "Interviewed":
            return {
                bg: "bg-violet-50",
                text: "text-violet-700",
                border: "border-violet-200",
                dot: "bg-violet-500",
                label: "Interviewed",
            }
        case "Offered":
            return {
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
                dot: "bg-emerald-500",
                label: "Offered",
            }
        case "Hired":
            return {
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                border: "border-emerald-200",
                dot: "bg-emerald-500",
                label: "Hired",
            }
        case "Rejected":
            return {
                bg: "bg-red-50",
                text: "text-red-700",
                border: "border-red-200",
                dot: "bg-red-500",
                label: "Rejected",
            }
        default:
            return {
                bg: "bg-[#F5F5F5]",
                text: "text-[#525252]",
                border: "border-[#E5E5E5]",
                dot: "bg-[#A3A3A3]",
                label: status || "Under review",
            }
    }
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

export default function CandidateApplicationsPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [applications, setApplications] = useState<CandidateApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        loadApplications()
    }, [router])

    const loadApplications = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            setError(null)
            const response = await apiClient.candidateApplicationStatus(userEmail)
            setApplications(response.applications || [])
        } catch (loadError: any) {
            console.error("Failed to load candidate applications", loadError)
            setError(loadError?.message || "Failed to load candidate applications")
        } finally {
            setLoading(false)
        }
    }

    const sortedApplications = [...applications].sort((a, b) => {
        const dateA = a.application_date ? new Date(a.application_date).getTime() : 0
        const dateB = b.application_date ? new Date(b.application_date).getTime() : 0
        return dateB - dateA
    })

    const counts = useMemo(() => {
        const all = applications.length
        const active = applications.filter((a) =>
            ["Shortlisted", "Interview Scheduled", "Interviewed", "Offered"].includes(
                a.shortlist_status || "",
            ),
        ).length
        const hired = applications.filter((a) => a.shortlist_status === "Hired").length
        const rejected = applications.filter((a) => a.shortlist_status === "Rejected").length
        return { all, active, hired, rejected }
    }, [applications])

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-40 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#034078] border-t-transparent" />
                </div>
            </MainLayout>
        )
    }

    if (error) {
        return (
            <MainLayout>
                <div className="mx-auto w-full max-w-6xl">
                    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
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
                            Tracking
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            My applications
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Every role you&apos;ve applied to and where it stands right now.
                        </p>
                    </div>
                    <Link href="/recruitment/candidate/jobs">
                        <Button className="bg-[#034078] text-white hover:bg-[#0A1128]">
                            Browse jobs
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile
                        icon={FileText}
                        label="Total"
                        value={counts.all}
                        accent="#034078"
                    />
                    <StatTile
                        icon={Clock}
                        label="Active"
                        value={counts.active}
                        accent="#1282A2"
                    />
                    <StatTile
                        icon={CheckCircle2}
                        label="Hired"
                        value={counts.hired}
                        accent="#28C76F"
                    />
                    <StatTile
                        icon={XCircle}
                        label="Rejected"
                        value={counts.rejected}
                        accent="#B91C1C"
                    />
                </div>

                {/* List */}
                {applications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-12 text-center">
                        <span
                            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-[#A3A3A3]"
                            style={{ background: "#F5F5F5" }}
                            aria-hidden="true"
                        >
                            <FileText className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-semibold text-[#0A1128]">No applications yet</p>
                        <p className="mt-1 text-xs text-[#525252]">
                            Apply to a role and your status will appear here.
                        </p>
                        <Link href="/recruitment/candidate/jobs">
                            <Button
                                variant="outline"
                                className="mt-4 border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                            >
                                <Briefcase className="mr-2 h-4 w-4" />
                                Browse jobs
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedApplications.map((application) => {
                            const tone = statusTone(application.shortlist_status)
                            return (
                                <button
                                    key={application.name}
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            `/recruitment/candidate/applications/${encodeURIComponent(application.name)}`,
                                        )
                                    }
                                    className="group block w-full rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left transition-all hover:border-[#034078]/30 hover:shadow-md"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="truncate text-base font-semibold text-[#0A1128] group-hover:text-[#034078]">
                                                    {application.job_title || "Application"}
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
                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#525252]">
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarDays className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                                    {application.application_date
                                                        ? new Date(application.application_date).toLocaleDateString()
                                                        : "—"}
                                                </span>
                                                {application.ai_score != null && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Sparkles className="h-3.5 w-3.5 text-[#1282A2]" />
                                                        <span className="font-semibold text-[#1282A2]">
                                                            {application.ai_score.toFixed(1)}
                                                        </span>
                                                        <span className="text-[#A3A3A3]">AI score</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#034078]" />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
