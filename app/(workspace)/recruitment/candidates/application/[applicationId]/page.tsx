"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Award, Briefcase, Mail, Phone, FileText, Calendar, Video, Play, AlertCircle, User, BarChart3, Sparkles, Star } from "lucide-react"
import Link from "next/link"

function getInitials(name?: string | null, email?: string | null): string {
    const source = name || (email ? email.split("@")[0] : null)
    if (!source) return "?"
    const parts = source.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const APP_STATUS_TONES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
    "Not Reviewed": { dot: "#A3A3A3", text: "#525252", bg: "#F5F5F5", border: "#E5E5E5" },
    Shortlisted: { dot: "#1282A2", text: "#034078", bg: "#EFF6FF", border: "#BFDBFE" },
    "Interview Scheduled": { dot: "#F97316", text: "#9A3412", bg: "#FFF7ED", border: "#FED7AA" },
    Interviewed: { dot: "#7C3AED", text: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" },
    Offered: { dot: "#28C76F", text: "#166534", bg: "#DCFCE7", border: "#BBF7D0" },
    Hired: { dot: "#28C76F", text: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
    Rejected: { dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
}
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EvaluationDisplay } from "@/components/recruitment/interviews/evaluation-display"

export default function CandidateApplicationPage() {
    const params = useParams()
    const router = useRouter()
    const applicationId = params.applicationId as string

    const [appDetails, setAppDetails] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [videoModalOpen, setVideoModalOpen] = useState(false)
    const [hrComment, setHrComment] = useState("")
    const [submittingComment, setSubmittingComment] = useState(false)
    const [commentError, setCommentError] = useState<string | null>(null)
    const [commentSuccess, setCommentSuccess] = useState<string | null>(null)
    const [hasReviewedRecording, setHasReviewedRecording] = useState(false)
    const [manualReview, setManualReview] = useState("")
    const [submittingReview, setSubmittingReview] = useState(false)
    const [reviewError, setReviewError] = useState<string | null>(null)
    const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)

    useEffect(() => {
        loadApplicationDetails()
    }, [applicationId])

    // Poll the interview session while the egress (recording) is still being
    // produced so the page swaps from "processing" to "ready" automatically.
    useEffect(() => {
        const interview = appDetails?.interview_session
        if (!interview?.name) return
        const status = interview.egress_status
        const isFinal = status === 'Ended' || status === 'Failed' || status === 'Aborted'
        if (isFinal) return
        if (!status && interview.recording_url) return
        const id = setInterval(async () => {
            try {
                await loadApplicationDetails()
            } catch (err) {
                console.warn('[egress] application poll failed:', err)
            }
        }, 3000)
        return () => clearInterval(id)
    }, [appDetails?.interview_session?.egress_status, appDetails?.interview_session?.recording_url, appDetails?.interview_session?.name])

    const loadApplicationDetails = async () => {
        try {
            setLoading(true)
            const result = await apiClient.getCandidateApplicationDetails(applicationId)

            if (result?.success) {
                setAppDetails(result)
                setHrComment(result?.interview_session?.hr_comment || "")
            } else {
                setError(result?.error || "Failed to load application details")
            }
        } catch (err) {
            console.error("Error loading details:", err)
            setError("Error loading application details")
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Shortlisted": "bg-[#1282A2]/20 text-[#1282A2] border-[#1282A2]/40",
            "Interview Scheduled": "bg-amber-100 text-amber-800 border-amber-300",
            "Interviewed": "bg-purple-100 text-purple-800 border-purple-300",
            "Offered": "bg-green-100 text-green-800 border-green-300",
            "Hired": "bg-emerald-100 text-emerald-800 border-emerald-300",
            "Rejected": "bg-red-100 text-red-800 border-red-300",
            "Not Reviewed": "bg-gray-100 text-gray-800 border-gray-300",
        }
        return colors[status] || "bg-gray-100 text-gray-800 border-gray-300"
    }

    const isYouTubeUrl = (url: string) => {
        return url.includes("youtube.com") || url.includes("youtu.be")
    }

    const getYouTubeEmbedUrl = (url: string) => {
        let videoId = ""
        if (url.includes("youtube.com")) {
            videoId = url.split("v=")[1]?.split("&")[0]
        } else if (url.includes("youtu.be")) {
            videoId = url.split("youtu.be/")[1]?.split("?")[0]
        }
        return `https://www.youtube.com/embed/${videoId}`
    }

    useEffect(() => {
        if (videoModalOpen) {
            setHasReviewedRecording(true)
        }
    }, [videoModalOpen])

    const handleSubmitHrComment = async () => {
        if (!interview) return
        if (!hrComment.trim()) {
            setCommentError("Please enter your comment before submitting.")
            return
        }
        if (interview.recording_url && !hasReviewedRecording) {
            setCommentError("Please review the recording before submitting your comment.")
            return
        }

        try {
            setSubmittingComment(true)
            setCommentError(null)
            setCommentSuccess(null)

            const result = await apiClient.apiCall<any>(
                "recruitment_app.api.interview_sessions.add_hr_comment_and_reevaluate",
                {
                    session_id: interview.name,
                    hr_comment: hrComment.trim(),
                }
            )

            if (result?.success) {
                setCommentSuccess("HR comment saved. Final evaluation will be generated shortly.")
                setTimeout(async () => {
                    await loadApplicationDetails()
                }, 5000)
            } else {
                setCommentError(result?.error || "Failed to save HR comment")
            }
        } catch (err) {
            console.error("Failed to submit HR comment:", err)
            setCommentError("Failed to save HR comment")
        } finally {
            setSubmittingComment(false)
        }
    }

    const handleSubmitManualReview = async () => {
        if (!applicationId) return
        if (!manualReview.trim()) {
            setReviewError("Please enter your review before submitting.")
            return
        }

        try {
            setSubmittingReview(true)
            setReviewError(null)
            setReviewSuccess(null)

            const result = await apiClient.updateManualReviewNotes(applicationId, manualReview.trim())

            if (result?.success) {
                setReviewSuccess("Review notes saved successfully.")
                setManualReview("")
                setTimeout(async () => {
                    await loadApplicationDetails()
                }, 2000)
            } else {
                setReviewError(result?.message || "Failed to save review notes")
            }
        } catch (err) {
            console.error("Failed to submit review:", err)
            setReviewError("Failed to save review notes")
        } finally {
            setSubmittingReview(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-40">
                <div className="w-9 h-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                </div>
            </MainLayout>
        )
    }

    if (error || !appDetails) {
        return (
            <MainLayout>
                <div>
                    <div className="mb-6">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Go back</TooltipContent>
                        </Tooltip>
                    </div>
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <p className="text-red-800">{error || "Failed to load application details"}</p>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        )
    }

    const candidate = appDetails.candidate
    const application = appDetails.application
    const jobPosting = appDetails.job_posting
    const interview = appDetails.interview_session
    // Hide the AI's interview verdict (score, summary, evaluation) until the
    // HR has filed their own assessment. The shortlisting AI analysis stays
    // visible — it's the AI's *interview* read we want to keep out of the
    // HR's eyes pre-comment.
    const interviewAiVisible = !!interview?.hr_comment

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="mb-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Go back</TooltipContent>
                    </Tooltip>
                </div>

                {/* Main Card */}
                <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
                    {/* Candidate Header */}
                    <div className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Application
                                </p>
                                <h1 className="mt-0.5 truncate text-2xl font-bold text-[#0A1128] sm:text-[28px]">
                                    {candidate?.name || "Unknown"}
                                </h1>
                                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#525252]">
                                    <Briefcase className="h-3.5 w-3.5 text-[#A3A3A3]" />
                                    {jobPosting?.job_title || "—"}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {(() => {
                                        const tone =
                                            APP_STATUS_TONES[application?.shortlist_status as string] ||
                                            APP_STATUS_TONES["Not Reviewed"]
                                        return (
                                            <span
                                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                                                style={{
                                                    background: tone.bg,
                                                    color: tone.text,
                                                    border: `1px solid ${tone.border}`,
                                                }}
                                            >
                                                <span
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{ background: tone.dot }}
                                                />
                                                {application?.shortlist_status || "Not Reviewed"}
                                            </span>
                                        )
                                    })()}
                                    {application?.ai_score != null && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-[#F9FAFB] px-2.5 py-1 text-xs font-semibold text-[#525252]">
                                            <Sparkles className="h-3 w-3 text-[#1282A2]" />
                                            Shortlist {application.ai_score.toFixed(1)}
                                        </span>
                                    )}
                                    {interviewAiVisible && interview?.score != null && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                            <Star className="h-3 w-3 fill-current" />
                                            Interview {interview.score.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Candidate Details */}
                    <div className="p-6 space-y-5 bg-white">
                        {/* Contact Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-5 border-b border-[#E5E5E5]">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="h-5 w-5 text-[#1282A2] flex-shrink-0" />
                                <span className="text-sm text-[#171717] break-all">{candidate?.email}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="h-5 w-5 text-[#1282A2] flex-shrink-0" />
                                <span className="text-sm text-[#171717]">{candidate?.phone || "Not provided"}</span>
                            </div>
                        </div>

                        {/* Application Timeline */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-5 border-b border-[#E5E5E5]">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="h-5 w-5 text-[#1282A2] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-[#525252] mb-1">Applied Date</p>
                                    <p className="text-sm text-[#171717] font-semibold">
                                        {application?.application_date
                                            ? new Date(application.application_date).toLocaleDateString()
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <FileText className="h-5 w-5 text-[#1282A2] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-[#525252] mb-1">HR Decision</p>
                                    <p className="text-sm text-[#171717] font-semibold">{application?.hr_decision || "Pending"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="h-5 w-5 text-[#1282A2] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-[#525252] mb-1">Shortlisted Date</p>
                                    <p className="text-sm text-[#171717] font-semibold">
                                        {application?.application_date
                                            ? new Date(application.application_date).toLocaleDateString()
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CV Attachment */}
                        {candidate?.cv_attachment && (
                            <div className="bg-[#1282A2]/5 border border-[#1282A2]/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-5 w-5 text-[#1282A2]" />
                                    <h4 className="text-sm font-bold text-[#0A1128]">CV Attachment</h4>
                                </div>
                                <a
                                    href={`https://api.colossalhub.com/${candidate.cv_attachment}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[#034078] hover:underline break-all"
                                >
                                    View CV Document →
                                </a>
                            </div>
                        )}

                        {/* Manual Review Notes */}
                        {/* {application?.manual_review_notes && (
                            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-[#525252]" />
                                    <h4 className="text-sm font-semibold text-[#0A1128]">Manual Review Notes</h4>
                                </div>
                                <p className="text-sm text-[#525252] leading-relaxed whitespace-pre-wrap">{application.manual_review_notes}</p>
                            </div>
                        )} */}
                    </div>
                </div>

                {/* AI Analysis and Interview Session — tabbed to keep the page manageable */}
                <Tabs defaultValue={interview ? 'interview' : 'ai-analysis'} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="ai-analysis" className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            AI Analysis
                        </TabsTrigger>
                        <TabsTrigger value="interview" className="gap-2">
                            <Video className="h-4 w-4" />
                            Interview Session
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai-analysis" className="mt-4">
                {/* AI Analysis Section */}
                {appDetails?.ai_analysis ? (
                    <Card className="border-[#E5E5E5]">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-[#E5E5E5]">
                            <CardTitle className="flex items-center gap-2 text-[#0A1128]">
                                <Award className="w-5 h-5 text-[#1282A2]" />
                                AI Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Score Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-[#525252] mb-1">Skills Match</p>
                                    <p className="text-2xl font-bold text-[#1282A2]">{appDetails.ai_analysis.skills_match_score ?? "-"}/100</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-[#525252] mb-1">Experience Match</p>
                                    <p className="text-2xl font-bold text-[#1282A2]">{appDetails.ai_analysis.experience_match_score ?? "-"}/100</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-[#525252] mb-1">Education Match</p>
                                    <p className="text-2xl font-bold text-[#1282A2]">{appDetails.ai_analysis.education_match_score ?? "-"}/100</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-[#525252] mb-1">Overall Fit</p>
                                    <p className="text-2xl font-bold text-[#1282A2]">{appDetails.ai_analysis.overall_fit_score}/100</p>
                                </div>
                            </div>

                            {/* Detailed Analysis Descriptions */}
                            <div className="space-y-4">
                                {/* Skills Match */}
                                {appDetails.ai_analysis.skills_match_description && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <div className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                                {appDetails.ai_analysis.skills_match_score ?? "-"}/100
                                            </div>
                                            <h4 className="text-sm font-bold text-[#0A1128] mt-1">Skills Assessment</h4>
                                        </div>
                                        <p className="text-sm text-[#525252] leading-relaxed">{appDetails.ai_analysis.skills_match_description}</p>
                                    </div>
                                )}

                                {/* Experience Match */}
                                {appDetails.ai_analysis.experience_match_description && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <div className="text-sm font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                                {appDetails.ai_analysis.experience_match_score ?? "-"}/100
                                            </div>
                                            <h4 className="text-sm font-bold text-[#0A1128] mt-1">Experience Evaluation</h4>
                                        </div>
                                        <p className="text-sm text-[#525252] leading-relaxed">{appDetails.ai_analysis.experience_match_description}</p>
                                    </div>
                                )}

                                {/* Education Match */}
                                {appDetails.ai_analysis.education_match_description && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <div className="text-sm font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                                {appDetails.ai_analysis.education_match_score ?? "-"}/100
                                            </div>
                                            <h4 className="text-sm font-bold text-[#0A1128] mt-1">Educational Background</h4>
                                        </div>
                                        <p className="text-sm text-[#525252] leading-relaxed">{appDetails.ai_analysis.education_match_description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Recommendation */}
                            <div className={`p-4 rounded-lg border ${appDetails.ai_analysis.recommendation === "Reject"
                                ? "bg-red-50 border-red-200"
                                : appDetails.ai_analysis.recommendation === "Interview"
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-green-50 border-green-200"
                                }`}>
                                <p className="text-xs font-semibold text-[#525252] mb-2">AI RECOMMENDATION</p>
                                <p className={`text-lg font-bold ${appDetails.ai_analysis.recommendation === "Reject"
                                    ? "text-red-700"
                                    : appDetails.ai_analysis.recommendation === "Interview"
                                        ? "text-amber-700"
                                        : "text-green-700"
                                    }`}>
                                    {appDetails.ai_analysis.recommendation}
                                </p>
                            </div>

                            {/* Key Strengths */}
                            {appDetails.ai_analysis.key_strengths && appDetails.ai_analysis.key_strengths.length > 0 && (
                                <div className="bg-[#1282A2]/5 border border-[#1282A2]/20 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-[#0A1128] mb-3">Key Strengths</h4>
                                    <ul className="space-y-2">
                                        {appDetails.ai_analysis.key_strengths.map((strength: string, idx: number) => (
                                            <li key={idx} className="text-sm text-[#525252] flex items-start gap-2">
                                                <span className="text-[#1282A2] font-bold mt-0.5">•</span>
                                                {strength}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Potential Concerns */}
                            {appDetails.ai_analysis.potential_concerns && appDetails.ai_analysis.potential_concerns.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-[#0A1128] mb-3">Potential Concerns</h4>
                                    <ul className="space-y-2">
                                        {appDetails.ai_analysis.potential_concerns.map((concern: string, idx: number) => (
                                            <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                                                <span className="font-bold mt-0.5">•</span>
                                                {concern}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Detailed Analysis */}
                            {appDetails.ai_analysis.overall_fit_description && (
                                <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-[#0A1128] mb-2">Analysis Summary</h4>
                                    <p className="text-sm text-[#525252] leading-relaxed">{appDetails.ai_analysis.overall_fit_description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-[#E5E5E5]">
                        <CardContent className="py-12 text-center text-sm text-[#A3A3A3]">
                            No AI shortlisting analysis is available for this application yet.
                        </CardContent>
                    </Card>
                )}
                    </TabsContent>

                    <TabsContent value="interview" className="mt-4">
                        {interview ? (
                            <Card className="border-[#E5E5E5]">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-[#E5E5E5]">
                                    <CardTitle className="flex items-center gap-2 text-[#0A1128]">
                                        <Video className="w-5 h-5 text-[#1282A2]" />
                                        Interview Session
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    {!interviewAiVisible && interview.status === 'Completed' && (
                                        <div
                                            className="flex items-start gap-3 rounded-lg px-4 py-3"
                                            style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
                                        >
                                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#9A3412' }} />
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: '#9A3412' }}>
                                                    AI evaluation is hidden until you submit your assessment
                                                </p>
                                                <p className="text-xs mt-1" style={{ color: '#9A3412' }}>
                                                    Watch the recording and write your HR comment first. The AI&apos;s scoring
                                                    and analysis are revealed afterwards so they don&apos;t bias your judgement.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm">
                                                <span className="text-[#525252]">Status</span>
                                                <p className="font-semibold text-[#0A1128] mt-1">{interview.status}</p>
                                            </div>
                                        </div>
                                        {interviewAiVisible && (
                                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="text-sm">
                                                    <span className="text-[#525252]">Score</span>
                                                    <p className="font-semibold text-[#0A1128] mt-1">{interview.score?.toFixed(1) || "-"}%</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm">
                                                <span className="text-[#525252]">Start Time</span>
                                                <p className="font-semibold text-[#0A1128] mt-1">
                                                    {interview.start_time ? new Date(interview.start_time).toLocaleString() : "-"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm">
                                                <span className="text-[#525252]">End Time</span>
                                                <p className="font-semibold text-[#0A1128] mt-1">
                                                    {interview.end_time ? new Date(interview.end_time).toLocaleString() : "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {interview.status === "Completed" && (() => {
                                        const eg = interview.egress_status
                                        const ready = eg === 'Ended' && !!interview.recording_url
                                        const legacyReady = !eg && !!interview.recording_url
                                        const processing = eg === 'Requested' || eg === 'Active' || (!eg && !interview.recording_url && !!interview.end_time)
                                        const failed = eg === 'Failed' || eg === 'Aborted'
                                        if (ready || legacyReady) {
                                            return (
                                                <Button
                                                    onClick={() => setVideoModalOpen(true)}
                                                    className="inline-flex items-center gap-2 px-4 py-3 bg-[#034078]/10 hover:bg-[#034078]/20 text-[#034078] rounded-lg transition-colors border border-[#034078]/30"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    <span className="font-medium">Watch Recording</span>
                                                </Button>
                                            )
                                        }
                                        if (processing) {
                                            return (
                                                <div className="flex items-center gap-3 text-sm text-[#525252] bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-3">
                                                    <div className="w-4 h-4 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                                                    Recording is processing — this page refreshes automatically when it&apos;s ready.
                                                </div>
                                            )
                                        }
                                        if (failed) {
                                            return (
                                                <div className="flex items-start gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold">Recording unavailable</p>
                                                        <p className="text-xs mt-1">
                                                            {interview.egress_error || 'The server-side recording job did not complete.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    })()}

                                    {interviewAiVisible && interview.summary && (
                                        <div className="bg-[#1282A2]/5 border border-[#1282A2]/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-5 w-5 text-[#1282A2]" />
                                                <h4 className="text-sm font-bold text-[#0A1128]">Interview Summary</h4>
                                            </div>
                                            <p className="text-sm text-[#525252] leading-relaxed whitespace-pre-wrap">{interview.summary}</p>
                                        </div>
                                    )}

                                    {interviewAiVisible && interview.ai_evaluation && (
                                        <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Award className="h-5 w-5 text-[#1282A2]" />
                                                <h4 className="text-sm font-bold text-[#0A1128]">AI Evaluation</h4>
                                            </div>
                                            <EvaluationDisplay evaluation={interview.ai_evaluation} variant="initial" />
                                        </div>
                                    )}

                                    {interview.final_ai_evaluation && (
                                        <div className="rounded-lg border border-[#034078]/20 bg-[#034078]/5 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Award className="h-5 w-5 text-[#034078]" />
                                                <h4 className="text-sm font-bold text-[#0A1128]">Final AI Evaluation</h4>
                                                <Badge className="ml-1 bg-[#034078] text-white border-[#034078] text-[10px] uppercase tracking-wide">
                                                    Post HR Comment
                                                </Badge>
                                            </div>
                                            <EvaluationDisplay evaluation={interview.final_ai_evaluation} variant="final" />
                                        </div>
                                    )}

                                    {interview.status === "Completed" && (
                                        <div className="bg-[#034078]/5 border border-[#034078]/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileText className="h-5 w-5 text-[#034078]" />
                                                <h4 className="text-sm font-bold text-[#0A1128]">HR Comment</h4>
                                            </div>
                                            {interview.hr_comment ? (
                                                <div className="bg-white rounded-lg p-3 border border-[#E5E5E5] text-sm text-[#525252] leading-relaxed whitespace-pre-wrap">
                                                    {interview.hr_comment}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {interview.recording_url && (
                                                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            Please review the recording before submitting your comment.
                                                        </div>
                                                    )}
                                                    <Textarea
                                                        placeholder="Add your HR comment here..."
                                                        value={hrComment}
                                                        onChange={(e) => setHrComment(e.target.value)}
                                                        className="min-h-[120px]"
                                                    />
                                                    {interview.recording_url && (
                                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={hasReviewedRecording}
                                                                onChange={(e) => setHasReviewedRecording(e.target.checked)}
                                                            />
                                                            I have reviewed the recording.
                                                        </label>
                                                    )}
                                                    {commentError && (
                                                        <p className="text-sm text-red-600">{commentError}</p>
                                                    )}
                                                    {commentSuccess && (
                                                        <p className="text-sm text-emerald-600">{commentSuccess}</p>
                                                    )}
                                                    <Button
                                                        onClick={handleSubmitHrComment}
                                                        disabled={submittingComment || (interview.recording_url && !hasReviewedRecording)}
                                                    >
                                                        {submittingComment ? "Submitting..." : "Submit HR Comment"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {interview.transcript && (
                                        <div className="bg-gray-50 border border-[#E5E5E5] rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-5 w-5 text-[#525252]" />
                                                <h4 className="text-sm font-bold text-[#0A1128]">Transcript</h4>
                                            </div>
                                            <div className="text-xs bg-white p-3 rounded max-h-64 overflow-auto border border-[#E5E5E5]">
                                                <pre className="whitespace-pre-wrap text-[#525252]">{interview.transcript}</pre>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-[#E5E5E5]">
                                <CardContent className="py-12 text-center text-sm text-[#A3A3A3]">
                                    This candidate hasn&apos;t completed an interview yet.
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Manual Review Notes Section */}
                <Card className="border-[#E5E5E5]">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-[#E5E5E5]">
                        <CardTitle className="flex items-center gap-2 text-[#0A1128]">
                            <FileText className="w-5 h-5 text-[#034078]" />
                            Your Review Notes
                        </CardTitle>
                        <CardDescription>Share your thoughts on the AI review and candidate assessment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {appDetails?.application?.manual_review_notes && (
                            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-4 mb-4">
                                <p className="text-xs font-semibold text-[#525252] mb-2">PREVIOUS REVIEWS</p>
                                <p className="text-sm text-[#525252] leading-relaxed whitespace-pre-wrap">{appDetails.application.manual_review_notes}</p>
                            </div>
                        )}
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Add your review notes here... (e.g., thoughts on the AI assessment, agreement/disagreement with the score, additional observations)"
                                value={manualReview}
                                onChange={(e) => setManualReview(e.target.value)}
                                className="min-h-[120px]"
                            />
                            {reviewError && (
                                <p className="text-sm text-red-600">{reviewError}</p>
                            )}
                            {reviewSuccess && (
                                <p className="text-sm text-emerald-600">{reviewSuccess}</p>
                            )}
                            <Button
                                onClick={handleSubmitManualReview}
                                disabled={submittingReview}
                                className="w-full"
                            >
                                {submittingReview ? "Submitting..." : "Submit Review Notes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Video Modal */}
            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent className="max-w-6xl w-full max-h-[100vh] p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="w-10 h-10 bg-[#034078] rounded-lg flex items-center justify-center">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            Interview Recording
                        </DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            {candidate?.name} - {jobPosting?.job_title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full bg-black p-6">
                        {interview?.recording_url && isYouTubeUrl(interview.recording_url) ? (
                            <iframe
                                src={getYouTubeEmbedUrl(interview.recording_url)}
                                className="w-full rounded-lg shadow-2xl"
                                style={{ minHeight: "500px", maxHeight: "70vh", height: "60vh" }}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Interview Recording"
                            />
                        ) : (
                            <video
                                controls
                                className="w-full rounded-lg shadow-2xl"
                                style={{ minHeight: "500px", maxHeight: "70vh", height: "60vh" }}
                                src={interview?.recording_url ? `/api/recordings/stream?sessionId=${interview.name}` : undefined}
                                preload="metadata"
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    )
}
