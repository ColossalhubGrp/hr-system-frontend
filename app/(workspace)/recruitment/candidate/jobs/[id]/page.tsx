"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/sonner"
import { ArrowLeft, Briefcase, CalendarDays, Loader2, Sparkles, Target, CheckCircle2, AlertTriangle, LogIn } from "lucide-react"
import type { JobPosting } from "@/lib/recruitment/types"
import {
    extractQualificationsFromDescription,
    extractSkillsFromDescription,
    getCleanTextOrFallback,
    splitSkills,
    stripSectionsFromDescription,
} from "@/lib/recruitment/job-content"

const parseNumeric = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

const normalizeScore = (value: number | null) => {
    if (value == null) return null
    const scaled = value <= 1 ? value * 100 : value
    return Math.max(0, Math.min(100, Math.round(scaled)))
}

const extractMatchScore = (payload: any): number | null => {
    const candidates: unknown[] = [
        payload?.match_score,
        payload?.score,
        payload?.overall_score,
        payload?.overall_fit_score,
        payload?.fit_score,
        payload?.ai_score,
        payload?.data?.match_score,
        payload?.data?.score,
        payload?.data?.overall_fit_score,
        payload?.result?.match_score,
        payload?.result?.score,
    ]

    for (const candidate of candidates) {
        const parsed = parseNumeric(candidate)
        if (parsed != null) return normalizeScore(parsed)
    }

    return null
}

const extractMatchSummary = (payload: any): string => {
    const summaryCandidates: unknown[] = [
        payload?.summary,
        payload?.recommendation,
        payload?.analysis,
        payload?.reasoning,
        payload?.message,
        payload?.data?.summary,
        payload?.data?.recommendation,
        payload?.data?.analysis,
        payload?.result?.summary,
        payload?.result?.recommendation,
    ]

    for (const candidate of summaryCandidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim()
        }
    }

    return "Your match score is calculated from your candidate profile, skills alignment, and experience fit for this role."
}

const toDateTime = (value?: string) => {
    if (!value) return "Not specified"
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const containsHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)

const sanitizeRichHtml = (value: string) => {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
        .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s(href|src)=("|')\s*javascript:[\s\S]*?\2/gi, "")
        .replace(/<p>\s*<\/p>/gi, "")
}

const textBlocks = (value?: string) => {
    if (!value?.trim()) return []
    return value
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
}

const renderRichContent = (value?: string, emptyLabel = "No description provided.") => {
    if (!value?.trim()) {
        return <p className="text-sm text-[#525252]">{emptyLabel}</p>
    }

    const content = value.trim()
    if (containsHtml(content)) {
        return (
            <div
                className="prose prose-sm max-w-none text-[#525252] [&_h1]:text-[#0A1128] [&_h2]:text-[#0A1128] [&_h3]:text-[#0A1128] [&_p]:text-[#525252] [&_li]:text-[#525252]"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
            />
        )
    }

    const lines = textBlocks(content)
    if (!lines.length) {
        return <p className="text-sm text-[#525252]">{emptyLabel}</p>
    }

    return (
        <div className="space-y-2">
            {lines.map((line, index) => (
                <p className="text-sm text-[#525252]" key={`${line}-${index}`}>{line}</p>
            ))}
        </div>
    )
}

// ✅ Moved OUTSIDE CandidateJobDetailPage to prevent remounting on every render,
// which was causing input focus loss after typing a single character.
const PageShell = ({
    children,
    isAuthenticated,
    isHydrated,
}: {
    children: ReactNode
    isAuthenticated: boolean
    isHydrated: boolean
}) => {
    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
            </div>
        )
    }

    if (isAuthenticated) {
        return <MainLayout>{children}</MainLayout>
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </div>
    )
}

export default function CandidateJobDetailPage() {
    const router = useRouter()
    const params = useParams()
    const jobId = useMemo(() => decodeURIComponent(String(params.id || "")), [params.id])
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const isAuthenticated = useMemo(() => apiClient.isAuthenticated(), [userEmail])

    const [job, setJob] = useState<JobPosting | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [loadingMatch, setLoadingMatch] = useState(true)
    const [matchScore, setMatchScore] = useState<number | null>(null)
    const [matchSummary, setMatchSummary] = useState("")
    const [recommendationFitScore, setRecommendationFitScore] = useState<number | null>(null)

    const [proposal, setProposal] = useState("")
    const [applying, setApplying] = useState(false)
    const [applied, setApplied] = useState(false)
    const [alreadyApplied, setAlreadyApplied] = useState(false)
    const [existingApplicationStatus, setExistingApplicationStatus] = useState<string>("")
    const [applyAsGuest, setApplyAsGuest] = useState(true)
    const [guestName, setGuestName] = useState("")
    const [guestEmail, setGuestEmail] = useState("")
    const [guestPhone, setGuestPhone] = useState("")
    const [guestCvFile, setGuestCvFile] = useState<File | null>(null)
    const [guestWarningAccepted, setGuestWarningAccepted] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)

    const isOpenRole = (job?.status || "").toLowerCase() === "open"

    const handleGuestNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestName(e.target.value)
    }, [])

    const handleGuestEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestEmail(e.target.value)
    }, [])

    const handleGuestPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestPhone(e.target.value)
    }, [])

    const handleGuestCvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestCvFile(e.target.files?.[0] || null)
    }, [])

    const handleGuestWarningChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setGuestWarningAccepted(e.target.checked)
    }, [])

    const handleProposalChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setProposal(e.target.value)
    }, [])

    const handleApplyAsGuestToggle = useCallback(() => {
        setApplyAsGuest(true)
    }, [])

    const handleLoginToggle = useCallback(() => {
        setApplyAsGuest(false)
    }, [])

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        void loadJobData()
    }, [jobId, userEmail, isAuthenticated])

    const loadJobData = async () => {
        if (!jobId) {
            setLoadError("Invalid job ID")
            setLoading(false)
            setLoadingMatch(false)
            return
        }

        setLoading(true)
        setLoadingMatch(true)
        setLoadError(null)
        setAlreadyApplied(false)
        setExistingApplicationStatus("")
        setRecommendationFitScore(null)

        const [jobResult, matchResult, recommendationsResult, applicationStatusResult] = await Promise.allSettled([
            isAuthenticated ? apiClient.candidateGetJobPosting(jobId) : apiClient.publicGetJob(jobId),
            isAuthenticated && userEmail ? apiClient.candidateAiMatch(userEmail, jobId) : Promise.resolve(null),
            isAuthenticated && userEmail ? apiClient.candidateAiJobRecommendations(userEmail, 30) : Promise.resolve({ recommended_jobs: [] }),
            isAuthenticated && userEmail ? apiClient.candidateApplicationStatus(userEmail) : Promise.resolve({ applications: [] }),
        ])

        if (jobResult.status === "fulfilled") {
            setJob(jobResult.value)
        } else {
            setLoadError(jobResult.reason?.message || "Failed to load job details")
        }

        if (matchResult.status === "fulfilled" && matchResult.value) {
            setMatchScore(extractMatchScore(matchResult.value))
            setMatchSummary(extractMatchSummary(matchResult.value))
        } else {
            setMatchScore(null)
            setMatchSummary(isAuthenticated
                ? "Could not compute your match score right now. You can still review details and apply."
                : "Sign in to see your personalized fit score. You can still apply as a guest below.")
        }

        const normalizedJobName = (jobResult.status === "fulfilled" ? jobResult.value?.name : jobId || "").toLowerCase().trim()

        if (recommendationsResult.status === "fulfilled") {
            const recommendation = (recommendationsResult.value?.recommended_jobs || []).find((item) =>
                String(item?.name || "").toLowerCase().trim() === normalizedJobName
            )

            const recommendationScore = normalizeScore(parseNumeric(recommendation?.job_match_score))
            if (recommendationScore != null) {
                setRecommendationFitScore(recommendationScore)
            } else if (jobResult.status === "fulfilled") {
                setRecommendationFitScore(normalizeScore(parseNumeric(jobResult.value?.job_match_score)))
            }
        } else if (jobResult.status === "fulfilled") {
            setRecommendationFitScore(normalizeScore(parseNumeric(jobResult.value?.job_match_score)))
        }

        if (applicationStatusResult.status === "fulfilled") {
            const applications = applicationStatusResult.value?.applications || []
            const existingApplication = applications.find((application) =>
                String(application.job_posting || "").toLowerCase().trim() === normalizedJobName
            )

            if (existingApplication) {
                setAlreadyApplied(true)
                setExistingApplicationStatus(existingApplication.shortlist_status || "Not Reviewed")
            }
        }

        setLoading(false)
        setLoadingMatch(false)
    }

    const handleApply = async () => {
        if (!job || !userEmail) {
            toast.error("User email not found. Please log in again.")
            return
        }

        if (alreadyApplied) {
            toast.error("You have already applied to this job")
            return
        }

        setApplying(true)
        try {
            let cvUrl: string | undefined
            let candidateName = ""
            let candidatePhone = ""
            try {
                const profile = await apiClient.getCandidateSelfProfile(userEmail)
                cvUrl = profile?.cv_url || profile?.resume_url || undefined
                candidateName = String(profile?.full_name || profile?.candidate_name || "").trim()
                candidatePhone = String(profile?.phone || profile?.mobile_no || "").trim()
            } catch {
                cvUrl = undefined
            }

            if (!candidateName) {
                throw new Error("Please complete your profile with your full name before applying.")
            }

            if (!candidatePhone) {
                throw new Error("Please complete your profile with your phone number before applying.")
            }

            if (!cvUrl) {
                throw new Error("Please upload your CV in your profile before applying.")
            }

            const detailsJson = proposal.trim()
                ? JSON.stringify({
                    proposal: proposal.trim(),
                })
                : undefined

            const response = await apiClient.candidateApply(
                job.name,
                userEmail,
                candidateName,
                candidatePhone,
                cvUrl,
                detailsJson
            )
            if (!response?.success) {
                throw new Error(response?.error || "Failed to submit application")
            }

            setApplied(true)
            toast.success("Application submitted successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to apply")
        } finally {
            setApplying(false)
        }
    }

    const handleGuestApply = async () => {
        if (!job) return
        if (alreadyApplied) {
            toast.error("An application already exists for this job and email.")
            return
        }

        const normalizedName = guestName.trim()
        const normalizedEmail = guestEmail.trim().toLowerCase()
        const normalizedPhone = guestPhone.trim()

        if (!normalizedName) {
            toast.error("Candidate name is required")
            return
        }

        if (!normalizedEmail) {
            toast.error("Candidate email is required")
            return
        }

        if (!normalizedPhone) {
            toast.error("Phone is required")
            return
        }

        if (!guestCvFile) {
            toast.error("Please upload your CV to apply as a guest")
            return
        }

        if (!guestWarningAccepted) {
            return
        }

        setApplying(true)
        try {
            const uploadedCv = await apiClient.publicUploadCandidateCv(guestCvFile)
            const detailsJson = proposal.trim()
                ? JSON.stringify({ proposal: proposal.trim() })
                : undefined

            const response = await apiClient.publicCandidateApply({
                jobPosting: job.name,
                candidateEmail: normalizedEmail,
                candidateName: normalizedName,
                phone: normalizedPhone,
                cvUrl: uploadedCv.file_url,
                detailsJson,
            })

            if (!response?.success) {
                throw new Error(response?.error || "Failed to submit guest application")
            }

            setApplied(true)
            toast.success(response.duplicate
                ? "Application already exists for this email"
                : "Guest application submitted successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to apply as guest")
        } finally {
            setApplying(false)
        }
    }

    if (loading) {
        return (
            <PageShell isAuthenticated={isAuthenticated} isHydrated={isHydrated}>
                <div className="flex items-center justify-center h-64">
                    <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                </div>
            </PageShell>
        )
    }

    if (loadError || !job) {
        return (
            <PageShell isAuthenticated={isAuthenticated} isHydrated={isHydrated}>
                <div className="max-w-4xl mx-auto space-y-4">
                    <Card className="border-[#E5E5E5]">
                        <CardHeader>
                            <CardTitle className="text-[#0A1128]">Unable to open job details</CardTitle>
                            <CardDescription>{loadError || "The job could not be found."}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/recruitment/candidate/jobs">
                                <Button variant="outline">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Jobs
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </PageShell>
        )
    }

    const directSkills = splitSkills(job.required_skills)
    const inferredSkills = extractSkillsFromDescription(job.job_description)
    const skills = directSkills.length > 0 ? directSkills : inferredSkills
    const qualificationItems = extractQualificationsFromDescription(job.job_description)
    const cleanedJobDescription = stripSectionsFromDescription(job.job_description, [
        "qualifications\\s*&(?:amp;)?\\s*experience",
        "experience",
        "technical skills",
    ])
    const displayedFitScore = recommendationFitScore ?? matchScore
    const isGuestFormIncomplete =
        !guestName.trim() ||
        !guestEmail.trim() ||
        !guestPhone.trim() ||
        !guestCvFile
    const isGuestSubmitDisabled = !isAuthenticated && applyAsGuest && (isGuestFormIncomplete || !guestWarningAccepted)

    return (
        <PageShell isAuthenticated={isAuthenticated} isHydrated={isHydrated}>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Link href={isAuthenticated ? "/recruitment/candidate/jobs" : "/recruitment/jobs"}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Jobs
                        </Button>
                    </Link>
                    {isAuthenticated ? (
                        <Link href="/recruitment/candidate/applications">
                            <Button variant="outline">
                                <Briefcase className="h-4 w-4 mr-2" />
                                My Applications
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/recruitment/candidate/jobs/${encodeURIComponent(job.name)}`)}`)}
                        >
                            <LogIn className="h-4 w-4 mr-2" />
                            Login to Track Applications
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Hero */}
                        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                        Open role
                                    </p>
                                    <h1 className="mt-1 text-[26px] font-bold leading-tight text-[#0A1128]">
                                        {job.job_title}
                                    </h1>
                                    <p className="mt-1 max-w-xl text-sm text-[#525252]">
                                        Review the full role details before applying.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                        aria-hidden="true"
                                    />
                                    {job.status}
                                </span>
                            </div>
                            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#525252]">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                    Posted {toDateTime(job.posted_date)}
                                </span>
                                {typeof job.total_applications === "number" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-[#F9FAFB] px-2.5 py-0.5 font-semibold text-[#525252]">
                                        {job.total_applications} applications
                                    </span>
                                )}
                            </div>
                        </div>

                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128]">Job Description</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-[#525252]">
                                {renderRichContent(cleanedJobDescription, "No description provided.")}
                            </CardContent>
                        </Card>

                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128]">Qualifications & Experience</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-[#525252]">
                                {qualificationItems.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-2">
                                        {qualificationItems.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="space-y-2">
                                        <p><span className="font-medium text-[#171717]">Minimum Experience:</span> {typeof job.experience_min_years === "number" ? `${job.experience_min_years} years` : "Not specified"}</p>
                                        <p><span className="font-medium text-[#171717]">Education Required:</span> {getCleanTextOrFallback(job.education_required, "Not specified")}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128]">Required Skills</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {skills.length > 0 ? (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map((skill) => (
                                                <Badge key={skill} variant="outline">{skill}</Badge>
                                            ))}
                                        </div>
                                        {directSkills.length === 0 && inferredSkills.length > 0 && (
                                            <p className="text-xs text-[#525252]">Extracted from the Technical Skills section.</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-[#525252]">No required skills specified.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128] flex items-center gap-2">
                                    <Target className="h-5 w-5 text-[#1282A2]" />
                                    Fit Score
                                </CardTitle>
                                <CardDescription>Fit estimate for this specific role.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingMatch ? (
                                    <div className="flex items-center gap-2 text-sm text-[#525252]">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Calculating match...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-end gap-2">
                                            <p className="text-4xl font-bold text-[#034078]">{displayedFitScore != null ? `${displayedFitScore}%` : "--"}</p>
                                            <p className="text-xs text-[#525252] pb-1">fit</p>
                                        </div>
                                        {displayedFitScore != null && (
                                            <div className="h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                                                <div className="h-full bg-[#1282A2]" style={{ width: `${displayedFitScore}%` }} />
                                            </div>
                                        )}
                                        <p className="text-sm text-[#525252]">{matchSummary}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-[#E5E5E5]">
                            <CardHeader>
                                <CardTitle className="text-[#0A1128] flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-[#1282A2]" />
                                    Apply to this Job
                                </CardTitle>
                                <CardDescription>
                                    {isAuthenticated
                                        ? "Submit an application directly from this job page."
                                        : "Apply as a guest or login to track your application status."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {alreadyApplied ? (
                                    <div className="rounded-md border border-[#1282A2]/30 bg-[#1282A2]/10 p-3 text-sm text-[#034078] flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Already applied</p>
                                            <p className="text-xs mt-1">Current status: {existingApplicationStatus || "Not Reviewed"}</p>
                                        </div>
                                    </div>
                                ) : applied ? (
                                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Application submitted</p>
                                            <p className="text-xs mt-1">Track progress in My Applications if you have an account.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {!isAuthenticated && (
                                            <div className="grid grid-cols-2 gap-2 rounded-md border border-[#E5E5E5] p-1">
                                                <Button
                                                    type="button"
                                                    variant={applyAsGuest ? "default" : "outline"}
                                                    onClick={handleApplyAsGuestToggle}
                                                >
                                                    Apply as Guest
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={!applyAsGuest ? "default" : "outline"}
                                                    onClick={handleLoginToggle}
                                                >
                                                    Login & Apply
                                                </Button>
                                            </div>
                                        )}

                                        {(isAuthenticated || applyAsGuest) && (
                                            <>
                                                {!isAuthenticated && (
                                                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm flex gap-2 items-start">
                                                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                                                        <p>
                                                            Guest applications cannot be tracked later from a dashboard. Login if you need application tracking.
                                                        </p>
                                                    </div>
                                                )}

                                                {!isAuthenticated && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="guest-name">Full Name</Label>
                                                            <Input
                                                                id="guest-name"
                                                                name="guest-name"
                                                                type="text"
                                                                autoComplete="name"
                                                                value={guestName}
                                                                onChange={handleGuestNameChange}
                                                                placeholder="Enter your full name"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="guest-email">Email</Label>
                                                            <Input
                                                                id="guest-email"
                                                                name="guest-email"
                                                                type="email"
                                                                autoComplete="email"
                                                                value={guestEmail}
                                                                onChange={handleGuestEmailChange}
                                                                placeholder="Enter your email"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="guest-phone">Phone</Label>
                                                            <Input
                                                                id="guest-phone"
                                                                name="guest-phone"
                                                                type="tel"
                                                                autoComplete="tel"
                                                                value={guestPhone}
                                                                onChange={handleGuestPhoneChange}
                                                                placeholder="Enter your phone number"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="guest-cv">Upload CV</Label>
                                                            <Input
                                                                id="guest-cv"
                                                                name="guest-cv"
                                                                type="file"
                                                                accept=".pdf,.doc,.docx"
                                                                onChange={handleGuestCvChange}
                                                            />
                                                        </div>
                                                        <label className="flex items-start gap-2 text-sm text-[#525252] cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                name="guest-warning"
                                                                className="mt-1 cursor-pointer"
                                                                checked={guestWarningAccepted}
                                                                onChange={handleGuestWarningChange}
                                                            />
                                                            <span>I understand that guest applications cannot be tracked later.</span>
                                                        </label>
                                                    </div>
                                                )}

                                                <Textarea
                                                    name="proposal"
                                                    value={proposal}
                                                    onChange={handleProposalChange}
                                                    placeholder="Optional proposal or note for this application"
                                                    rows={6}
                                                />

                                                <Button
                                                    type="button"
                                                    onClick={isAuthenticated ? handleApply : handleGuestApply}
                                                    disabled={applying || !isOpenRole || alreadyApplied || isGuestSubmitDisabled}
                                                    className="w-full"
                                                >
                                                    {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Briefcase className="h-4 w-4 mr-2" />}
                                                    {applying ? "Applying..." : isOpenRole ? (isAuthenticated ? "Apply Now" : "Apply as Guest") : "Applications Closed"}
                                                </Button>
                                            </>
                                        )}

                                        {!isAuthenticated && !applyAsGuest && (
                                            <Button
                                                onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/recruitment/candidate/jobs/${encodeURIComponent(job.name)}`)}`)}
                                                className="w-full"
                                            >
                                                <LogIn className="h-4 w-4 mr-2" />
                                                Login to Apply and Track
                                            </Button>
                                        )}
                                    </>
                                )}
                                {isAuthenticated && (
                                    <Link href="/recruitment/candidate/applications" className="block">
                                        <Button variant="outline" className="w-full">Go to My Applications</Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageShell>
    )
}