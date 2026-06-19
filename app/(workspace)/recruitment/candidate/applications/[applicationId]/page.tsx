"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Button } from "@/components/ui/button"
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Award,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    ExternalLink,
    FileText,
    GraduationCap,
    Sparkles,
    Star,
    Target,
} from "lucide-react"
import type { CandidateApplication } from "@/lib/recruitment/types"

const API_BASE_URL = (process.env.FRAPPE_API_URL || "https://api.colossalhub.com").replace(/\/$/, "")

const toAbsoluteAssetUrl = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return ""
    if (/^https?:\/\//i.test(normalized)) return normalized
    if (normalized.startsWith("//")) return `https:${normalized}`
    if (normalized.startsWith("/")) return `${API_BASE_URL}${normalized}`
    return `${API_BASE_URL}/${normalized}`
}

const formatDate = (value?: string, withTime = false) => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return withTime ? date.toLocaleString() : date.toLocaleDateString()
}

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

function ScoreTile({
    icon: Icon,
    label,
    score,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    score?: number | null
}) {
    const value = typeof score === "number" ? Math.round(score) : null
    return (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center gap-2 text-[#A3A3A3]">
                <Icon className="h-4 w-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0A1128]">
                {value != null ? (
                    <>
                        {value}
                        <span className="text-sm font-medium text-[#A3A3A3]">/100</span>
                    </>
                ) : (
                    <span className="text-[#A3A3A3]">—</span>
                )}
            </p>
        </div>
    )
}

export default function CandidateApplicationDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const applicationId = useMemo(
        () => decodeURIComponent(String(params.applicationId || "")),
        [params.applicationId],
    )
    const userEmail = useMemo(() => getStoredUserEmail(), [])

    const [application, setApplication] = useState<CandidateApplication | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        void loadApplication()
    }, [router, applicationId])

    const loadApplication = async () => {
        if (!userEmail) {
            setError("Unable to identify your account. Please log in again.")
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const response = await apiClient.candidateApplicationStatus(userEmail)
            const found = (response.applications || []).find(
                (item) => item.name === applicationId,
            )

            if (!found) {
                setError("Application not found")
                setApplication(null)
                return
            }

            setApplication(found)
        } catch (loadError: any) {
            console.error("Failed to load application details", loadError)
            setError(loadError?.message || "Failed to load application details")
            setApplication(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-40 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#034078] border-t-transparent" />
                </div>
            </MainLayout>
        )
    }

    if (error || !application) {
        return (
            <MainLayout>
                <div className="mx-auto w-full max-w-4xl space-y-4">
                    <Link href="/recruitment/candidate/applications">
                        <Button
                            variant="outline"
                            className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to applications
                        </Button>
                    </Link>
                    <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p>{error || "Failed to load application"}</p>
                    </div>
                </div>
            </MainLayout>
        )
    }

    const aiSummary = application.ai_analysis_summary
    const aiAnalysis = application.ai_analysis

    const skillsScore = aiSummary?.skills_match?.score ?? aiAnalysis?.skills_match_score
    const experienceScore = aiSummary?.experience_match?.score ?? aiAnalysis?.experience_match_score
    const educationScore = aiSummary?.education_match?.score ?? aiAnalysis?.education_match_score
    const overallFitScore = aiSummary?.overall_fit?.score ?? aiAnalysis?.overall_fit_score

    const skillsDescription =
        aiSummary?.skills_match?.description ?? aiAnalysis?.skills_match_description
    const experienceDescription =
        aiSummary?.experience_match?.description ?? aiAnalysis?.experience_match_description
    const educationDescription =
        aiSummary?.education_match?.description ?? aiAnalysis?.education_match_description
    const overallFitDescription =
        aiSummary?.overall_fit?.description ?? aiAnalysis?.overall_fit_description

    const keyStrengths = aiSummary?.key_strengths || aiAnalysis?.key_strengths || []
    const potentialConcerns = aiSummary?.potential_concerns || aiAnalysis?.potential_concerns || []
    const recommendation =
        aiSummary?.recommendation || aiAnalysis?.recommendation || application.recommendation

    const tone = statusTone(application.shortlist_status)
    const hasAi = aiAnalysis || aiSummary

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <Link href="/recruitment/candidate/applications">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to applications
                    </Button>
                </Link>

                {/* Hero */}
                <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                My application
                            </p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#0A1128]">
                                {application.job_title || "Application"}
                            </h1>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#525252]">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                    Applied {formatDate(application.application_date, true)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                                    aria-hidden="true"
                                />
                                {tone.label}
                            </span>
                            {application.ai_score != null && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-[#F9FAFB] px-2.5 py-0.5 text-[11px] font-semibold text-[#525252]">
                                    <Award className="h-3 w-3 text-[#1282A2]" />
                                    AI score {application.ai_score.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* CV */}
                {application.cv_attachment && (
                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Attachment
                                </p>
                                <p className="truncate text-sm font-semibold text-[#0A1128]">
                                    CV submitted
                                </p>
                            </div>
                            <a
                                href={toAbsoluteAssetUrl(application.cv_attachment)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                                >
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Open CV
                                </Button>
                            </a>
                        </div>
                    </div>
                )}

                {/* AI analysis */}
                {hasAi && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                AI fit analysis
                            </p>
                            <p className="text-base font-semibold text-[#0A1128]">
                                How you stack up against the role
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <ScoreTile icon={Target} label="Skills match" score={skillsScore} />
                            <ScoreTile icon={Briefcase} label="Experience match" score={experienceScore} />
                            <ScoreTile icon={GraduationCap} label="Education match" score={educationScore} />
                            <ScoreTile icon={Star} label="Overall fit" score={overallFitScore} />
                        </div>

                        {(skillsDescription ||
                            experienceDescription ||
                            educationDescription ||
                            overallFitDescription) && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {skillsDescription && (
                                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Skills assessment
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#525252]">
                                            {skillsDescription}
                                        </p>
                                    </div>
                                )}
                                {experienceDescription && (
                                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Experience evaluation
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#525252]">
                                            {experienceDescription}
                                        </p>
                                    </div>
                                )}
                                {educationDescription && (
                                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Education evaluation
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#525252]">
                                            {educationDescription}
                                        </p>
                                    </div>
                                )}
                                {overallFitDescription && (
                                    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                            Overall fit summary
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#525252]">
                                            {overallFitDescription}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {recommendation && (
                            <div
                                className="rounded-2xl border p-4"
                                style={{
                                    background: "#EFF6FF",
                                    borderColor: "#034078",
                                }}
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#034078]">
                                    Recommendation
                                </p>
                                <p className="mt-1 text-base font-semibold text-[#0A1128]">
                                    {recommendation}
                                </p>
                            </div>
                        )}

                        {(keyStrengths.length > 0 || potentialConcerns.length > 0) && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {keyStrengths.length > 0 && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <p className="text-sm font-semibold text-[#0A1128]">
                                                Key strengths
                                            </p>
                                        </div>
                                        <ul className="mt-2 space-y-1.5 text-sm text-[#525252]">
                                            {keyStrengths.map((item, index) => (
                                                <li
                                                    key={`${item}-${index}`}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span
                                                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"
                                                        aria-hidden="true"
                                                    />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {potentialConcerns.length > 0 && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <p className="text-sm font-semibold text-[#0A1128]">
                                                Potential concerns
                                            </p>
                                        </div>
                                        <ul className="mt-2 space-y-1.5 text-sm text-[#525252]">
                                            {potentialConcerns.map((item, index) => (
                                                <li
                                                    key={`${item}-${index}`}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span
                                                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"
                                                        aria-hidden="true"
                                                    />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
