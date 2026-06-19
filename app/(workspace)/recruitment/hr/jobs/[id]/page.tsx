"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Award, Loader2, CheckCircle, RefreshCw, Copy, Share2, Mail, MessageCircle, Briefcase, Users, Star, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CategorizedQuestionsEditor } from "@/components/recruitment/interviews/categorized-questions-editor"
import type { JobPosting, CategorizedQuestion, InterviewQuestionCategory } from "@/lib/recruitment/types"
import { INTERVIEW_QUESTION_CATEGORIES } from "@/lib/recruitment/types"

function parseStoredQuestions(raw: string | null | undefined): CategorizedQuestion[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is CategorizedQuestion =>
          !!item &&
          typeof item === "object" &&
          typeof item.question === "string" &&
          typeof item.category === "string" &&
          (INTERVIEW_QUESTION_CATEGORIES as readonly string[]).includes(item.category)
      )
      .map((item) => ({
        category: item.category as InterviewQuestionCategory,
        question: item.question,
      }))
  } catch {
    return []
  }
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
import { toast } from "@/components/ui/sonner"

const BULLET_RE = /^\s*([•*-]|–|—)\s+/
const ORDERED_RE = /^\s*\d+[\).]\s+/
const BULLET_ONLY_RE = /^\s*([•*-]|–|—)\s*$/
const NUMBER_ONLY_RE = /^\s*\d+\s*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeLines = (text: string) => {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n")
  const lines: string[] = []

  for (let i = 0; i < rawLines.length; i += 1) {
    const current = rawLines[i].trim()
    if (!current) {
      lines.push("")
      continue
    }

    if (BULLET_ONLY_RE.test(current)) {
      const next = rawLines[i + 1]?.trim() || ""
      if (next) {
        lines.push(`• ${next}`)
        i += 1
        continue
      }
    }

    if (NUMBER_ONLY_RE.test(current)) {
      const next = rawLines[i + 1]?.trim() || ""
      if (next) {
        lines.push(`${current}. ${next}`)
        i += 1
        continue
      }
    }

    lines.push(rawLines[i])
  }

  return lines
}

const renderFormattedText = (text?: string, emptyLabel = "No description provided") => {
  if (!text || !text.trim()) {
    return <p className="text-muted-foreground">{emptyLabel}</p>
  }

  const trimmed = text.trim()
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return (
      <div
        className="prose prose-sm max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    )
  }

  const lines = normalizeLines(trimmed)
  const blocks: string[][] = []
  let current: string[] = []

  lines.forEach((line) => {
    if (!line.trim()) {
      if (current.length) {
        blocks.push(current)
        current = []
      }
      return
    }
    current.push(line)
  })

  if (current.length) blocks.push(current)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const bulletCount = block.filter((line) => BULLET_RE.test(line)).length
        const orderedCount = block.filter((line) => ORDERED_RE.test(line)).length
        const listCount = bulletCount + orderedCount

        if (listCount > 0 && listCount >= Math.ceil(block.length / 2)) {
          const isOrdered = orderedCount >= bulletCount
          const items = block
            .map((line) => line.replace(isOrdered ? ORDERED_RE : BULLET_RE, "").trim())
            .filter(Boolean)

          if (!items.length) {
            return (
              <div className="space-y-2" key={`block-${index}`}>
                {block.map((line, lineIndex) => (
                  <p className="text-muted-foreground" key={`line-${index}-${lineIndex}`}>
                    {line.trim()}
                  </p>
                ))}
              </div>
            )
          }

          const ListTag = isOrdered ? "ol" : "ul"
          const listClassName = isOrdered
            ? "list-decimal pl-6 space-y-2"
            : "list-disc pl-6 space-y-2"

          return (
            <ListTag className={listClassName} key={`block-${index}`}>
              {items.map((item, itemIndex) => (
                <li className="text-muted-foreground leading-relaxed" key={`item-${index}-${itemIndex}`}>
                  {item}
                </li>
              ))}
            </ListTag>
          )
        }

        return (
          <div className="space-y-2" key={`block-${index}`}>
            {block.map((line, lineIndex) => (
              <p className="text-muted-foreground leading-relaxed" key={`line-${index}-${lineIndex}`}>
                {line.trim()}
              </p>
            ))}
          </div>
        )
      })}
    </div>
  )
}

const ENROLLMENT_STAGES = [
  { value: "all", label: "All Applicants" },
  { value: "Shortlisted", label: "Reviewed" },
  { value: "Interview Scheduled", label: "Interview Scheduled" },
  { value: "Interviewed", label: "Interviewed" },
  { value: "Offered", label: "Offered" },
  { value: "Hired", label: "Hired" },
  { value: "Rejected", label: "Rejected" },
]

// Strict allowed transitions
const ALLOWED_TRANSITIONS: Record<string, Array<{ value: string; label: string }>> = {
  "Not Reviewed": [
    { value: "Shortlisted", label: "Accept & Shortlist (Reviewed)" },
    { value: "Rejected", label: "Reject" },
  ],
  "Shortlisted": [
    { value: "Interview Scheduled", label: "Accept & Invite to Interview" },
    { value: "Rejected", label: "Reject" },
  ],
  "Interview Scheduled": [
    { value: "Interviewed", label: "Interviewed" },
    { value: "Rejected", label: "Reject" },
  ],
  "Interviewed": [
    { value: "Offered", label: "Proceed to Offer" },
    { value: "Rejected", label: "Reject" },
  ],
  "Offered": [
    { value: "Hired", label: "Mark as Hired (Accepted Offer)" },
    { value: "Rejected", label: "Mark as Rejected (Declined Offer)" },
  ],
  "Hired": [],
  "Rejected": [],
  "": [
    { value: "Shortlisted", label: "Accept & Shortlist (Reviewed)" },
    { value: "Rejected", label: "Reject" },
  ],
}

function HrJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<any[]>([])
  const [loadingApplicants, setLoadingApplicants] = useState(false)
  const [rerunningShortlist, setRerunningShortlist] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [showRerunConfirm, setShowRerunConfirm] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "", message: "" })
  const [transitionError, setTransitionError] = useState(false)
  const [showInterviewQuestionsDialog, setShowInterviewQuestionsDialog] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ applicationId: string; currentStatus: string; newStatus: string } | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<CategorizedQuestion[]>([])
  const [lastSubmittedInterviewQuestions, setLastSubmittedInterviewQuestions] = useState<CategorizedQuestion[]>([])
  const [interviewInviteEmail, setInterviewInviteEmail] = useState("")
  const [submittingQuestions, setSubmittingQuestions] = useState(false)
  const [interviewDuration, setInterviewDuration] = useState("30") // default 30 minutes as string
  const [shareChannel, setShareChannel] = useState("")
  const [candidateJobUrl, setCandidateJobUrl] = useState("")

  const interviewQuestionsStorageKey = `interview_questions_template_${jobId}`


  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      router.push("/login")
      return
    }
    loadJob()
    loadApplicants()
  }, [router, jobId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedTemplate = parseStoredQuestions(localStorage.getItem(interviewQuestionsStorageKey))
    if (savedTemplate.length > 0) {
      setLastSubmittedInterviewQuestions(savedTemplate)
    }
  }, [interviewQuestionsStorageKey])

  useEffect(() => {
    const base = (
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    ).replace(/\/+$/, "")

    if (!base) {
      setCandidateJobUrl("")
      return
    }

    setCandidateJobUrl(`${base}/candidate/jobs/${encodeURIComponent(jobId)}`)
  }, [jobId])

  const isShortlistingInProgress =
    applicants.length > 0 &&
    applicants.some(app => app.shortlist_status === "Not Reviewed")

  const loadJob = async () => {
    try {
      const jobData = await apiClient.getJobPosting(jobId)
      setJob(jobData)

      if (
        lastSubmittedInterviewQuestions.length === 0 &&
        jobData?.interview_questions
      ) {
        const parsed = parseStoredQuestions(jobData.interview_questions)
        if (parsed.length > 0) {
          setLastSubmittedInterviewQuestions(parsed)
        }
      }
    } catch (error: any) {
      setErrorDialog({
        open: true,
        title: "Failed to Load Job",
        message: error.message || "Failed to load job posting. Redirecting..."
      })
      setTimeout(() => router.push("/recruitment/hr/jobs"), 2500)
    } finally {
      setLoading(false)
    }
  }

  const loadApplicants = async () => {
    setLoadingApplicants(true)
    try {
      const data = await apiClient.getCandidateApplications(jobId)
      setApplicants(data.data)
    } catch (error: any) {
      toast.error(error.message || "Failed to load applicants")
    } finally {
      setLoadingApplicants(false)
    }
  }

  const handleRerunShortlist = () => {
    setShowRerunConfirm(true)
  }

  const handleConfirmRerun = async () => {
    setRerunningShortlist(true)
    setShowRerunConfirm(false)
    try {
      const result = await apiClient.rerunShortlistForJob(jobId, true, true)

      if (result?.success) {
        toast.success("Shortlisting process started. The system will re-evaluate all applications.")
        // Reset applicants to allow refresh
        setApplicants(applicants.map(app => ({ ...app, shortlist_status: "Not Reviewed", ai_score: null })))
        // Reload after a delay to get updated results
        setTimeout(() => {
          loadApplicants()
          loadJob()
        }, 3000)
      } else {
        toast.error(result?.error || "Failed to start shortlisting process")
      }
    } catch (error: any) {
      console.error("Error rerunning shortlist:", error)
      toast.error(error.message || "Failed to start shortlisting process")
    } finally {
      setRerunningShortlist(false)
    }
  }

  const handleStatusChange = async (name: string, currentStatus: string, newStatus: string) => {
    // Validate allowed transition
    const normalized = currentStatus ?? "Not Reviewed"
    const allowed = ALLOWED_TRANSITIONS[normalized] || ALLOWED_TRANSITIONS[""]
    if (!allowed.some(a => a.value === newStatus)) {
      toast.error("This status transition is not allowed")
      return
    }

    // If transitioning to Interview Scheduled, show dialog for interview questions
    if (newStatus === "Interview Scheduled") {
      const applicant = applicants.find((app) => app.name === name)
      setInterviewInviteEmail(applicant?.email || "")
      const jobQuestions = parseStoredQuestions(job?.interview_questions)
      const seed = lastSubmittedInterviewQuestions.length > 0
        ? lastSubmittedInterviewQuestions
        : jobQuestions
      setInterviewQuestions(seed.map((q) => ({ ...q })))
      setPendingStatusChange({ applicationId: name, currentStatus: normalized, newStatus })
      setShowInterviewQuestionsDialog(true)
      return
    }

    try {
      await apiClient.updateApplicationStatus(name, newStatus)

      setApplicants(prev =>
        prev.map(app =>
          app.name === name ? { ...app, shortlist_status: newStatus } : app
        )
      )
      toast.success("Status updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    }
  }

  const handleConfirmInterviewQuestions = async () => {
    if (!pendingStatusChange) return

    const inviteEmail = interviewInviteEmail.trim()

    if (!inviteEmail) {
      toast.error("Candidate email is required to send interview invitation")
      return
    }

    if (!EMAIL_RE.test(inviteEmail)) {
      toast.error("Please enter a valid email address for interview invitation")
      return
    }

    const cleanedQuestions = interviewQuestions
      .map((q) => ({ category: q.category, question: q.question.trim() }))
      .filter((q) => q.question.length > 0)

    if (cleanedQuestions.length === 0) {
      toast.error("Add at least one interview question before sending the invitation")
      return
    }

    const missingCategory = cleanedQuestions.find(
      (q) => !(INTERVIEW_QUESTION_CATEGORIES as readonly string[]).includes(q.category)
    )
    if (missingCategory) {
      toast.error("Every question must have a valid category")
      return
    }

    setSubmittingQuestions(true)
    try {
      await apiClient.updateApplicationStatus(
        pendingStatusChange.applicationId,
        pendingStatusChange.newStatus,
        cleanedQuestions,
        inviteEmail,
        Number(interviewDuration)
      )

      setLastSubmittedInterviewQuestions(cleanedQuestions)
      if (typeof window !== "undefined") {
        localStorage.setItem(
          interviewQuestionsStorageKey,
          JSON.stringify(cleanedQuestions)
        )
      }

      setApplicants(prev =>
        prev.map(app =>
          app.name === pendingStatusChange.applicationId
            ? { ...app, shortlist_status: pendingStatusChange.newStatus }
            : app
        )
      )

      toast.success("Candidate invited to interview")
      setShowInterviewQuestionsDialog(false)
      setPendingStatusChange(null)
      setInterviewInviteEmail("")
      setInterviewQuestions([])
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    } finally {
      setSubmittingQuestions(false)
    }
  }

  const allowedOptionsFor = (currentStatus: string) => {
    const normalized = currentStatus ?? "Not Reviewed"
    return ALLOWED_TRANSITIONS[normalized] ?? ALLOWED_TRANSITIONS["Not Reviewed"]
  }

  const copyShareUrl = async () => {
    if (!candidateJobUrl) {
      toast.error("Candidate link is not available")
      return
    }

    try {
      await navigator.clipboard.writeText(candidateJobUrl)
      toast.success("Candidate job link copied")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleShareVia = async (channel: string) => {
    if (!candidateJobUrl) {
      toast.error("Candidate link is not available")
      setShareChannel("")
      return
    }

    const title = `Job opportunity: ${job?.job_title || "Open role"}`
    const text = `Apply here: ${candidateJobUrl}`
    const encodedTitle = encodeURIComponent(title)
    const encodedBody = encodeURIComponent(`${title}\n\n${candidateJobUrl}`)
    const encodedWhatsapp = encodeURIComponent(`${title} - ${candidateJobUrl}`)

    try {
      if (channel === "copy") {
        await copyShareUrl()
      } else if (channel === "native") {
        if (navigator.share) {
          await navigator.share({ title, text, url: candidateJobUrl })
        } else {
          toast.error("Native share is not supported in this browser")
        }
      } else if (channel === "email") {
        window.open(`mailto:?subject=${encodedTitle}&body=${encodedBody}`, "_blank")
      } else if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodedWhatsapp}`, "_blank", "noopener,noreferrer")
      }
    } catch {
      toast.error("Unable to complete share action")
    } finally {
      setShareChannel("")
    }
  }

  const filteredApplicants = activeTab === "all"
    ? applicants
    : applicants.filter(app => app.shortlist_status === activeTab)

  const getCountByStage = (stage: string) => {
    if (stage === "all") return applicants.length
    return applicants.filter(app => app.shortlist_status === stage).length
  }

  const APPLICANTS_PAGE_SIZE = 5
  const [applicantsPage, setApplicantsPage] = useState(1)
  const applicantsTotalPages = Math.max(1, Math.ceil(filteredApplicants.length / APPLICANTS_PAGE_SIZE))
  const applicantsSafePage = Math.min(applicantsPage, applicantsTotalPages)
  const applicantsPageStart = (applicantsSafePage - 1) * APPLICANTS_PAGE_SIZE
  const pagedApplicants = filteredApplicants.slice(applicantsPageStart, applicantsPageStart + APPLICANTS_PAGE_SIZE)
  useEffect(() => {
    setApplicantsPage(1)
  }, [activeTab])
  useEffect(() => {
    if (applicantsPage > applicantsTotalPages) setApplicantsPage(applicantsTotalPages)
  }, [applicantsPage, applicantsTotalPages])
  const applicantsPageWindow = (() => {
    const max = 5
    let from = Math.max(1, applicantsSafePage - Math.floor(max / 2))
    const to = Math.min(applicantsTotalPages, from + max - 1)
    if (to - from + 1 < max) from = Math.max(1, to - max + 1)
    const out: number[] = []
    for (let i = from; i <= to; i++) out.push(i)
    return out
  })()

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-40">
          <div className="w-9 h-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
        </div>
      </MainLayout>
    )
  }

  if (!job) return null

  const totalApps = job.total_applications ?? applicants.length
  const shortlistedApps = job.shortlisted_count ?? applicants.filter((a) => ["Shortlisted", "Interview Scheduled", "Interviewed", "Offered", "Hired"].includes(a.shortlist_status)).length
  const selectionRate = totalApps > 0 ? (shortlistedApps / totalApps) * 100 : null
  const jobStatusTone =
    job.status === "Open" ? { dot: "#28C76F", text: "#fff", bg: "rgba(40, 199, 111, 0.22)", border: "rgba(134, 239, 172, 0.4)" }
      : job.status === "Filled" ? { dot: "#7DD3FC", text: "#fff", bg: "rgba(125, 211, 252, 0.18)", border: "rgba(125, 211, 252, 0.4)" }
        : job.status === "Closed" ? { dot: "#A3A3A3", text: "#fff", bg: "rgba(255,255,255,0.18)", border: "rgba(255,255,255,0.28)" }
          : { dot: "#FDBA74", text: "#fff", bg: "rgba(253, 186, 116, 0.18)", border: "rgba(253, 186, 116, 0.4)" }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/recruitment/hr/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Job postings
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="outline" className="border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]">
              <Link href={`/recruitment/candidates/upload?job=${jobId}`} className="inline-flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload CVs
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(true)}
              className="border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
            >
              View details
            </Button>
            <Button
              onClick={handleRerunShortlist}
              disabled={rerunningShortlist}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rerunningShortlist ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Rerunning…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Rerun shortlisting
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hero */}
        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Job posting</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-[#0A1128] sm:text-[28px]">{job.job_title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: jobStatusTone.bg, color: jobStatusTone.text, border: `1px solid ${jobStatusTone.border}` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: jobStatusTone.dot }} />
                  {job.status}
                </span>
                {job.posted_date && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#525252]">
                    <CheckCircle className="h-3 w-3 text-[#A3A3A3]" />
                    Posted {new Date(job.posted_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Share strip */}
          {candidateJobUrl ? (
            <div className="border-t border-[#E5E5E5] bg-[#F9FAFB] px-6 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3]">Candidate application link</p>
                  <p className="mt-0.5 truncate text-xs text-[#525252]">Link to job posting - share with candidates</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <Select
                    value={shareChannel}
                    onValueChange={(value) => {
                      setShareChannel(value)
                      void handleShareVia(value)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] border-[#E5E5E5] bg-white text-xs text-[#525252] hover:bg-[#F5F5F5]">
                      <SelectValue placeholder="Share via…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Device share</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Email</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>WhatsApp</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="copy">
                        <div className="flex items-center gap-2">
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Copy link</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-white/15 bg-white/5 px-6 py-3">
              <p className="text-xs text-white/70">Application link unavailable. Configure FRONTEND_URL.</p>
            </div>
          )}
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Applications", value: totalApps, fg: "#525252", bg: "#F5F5F5", icon: Users },
            { label: "Shortlisted", value: shortlistedApps, fg: "#034078", bg: "#EFF6FF", icon: Award },
            {
              label: "Selection rate",
              value: selectionRate == null ? "—" : `${selectionRate.toFixed(0)}%`,
              fg: "#166534",
              bg: "#DCFCE7",
              icon: CheckCircle,
            },
            {
              label: "Reviewed",
              value: applicants.filter((a) => a.shortlist_status !== "Not Reviewed").length,
              fg: "#9A3412",
              bg: "#FFF7ED",
              icon: CheckCircle,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{s.label}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: s.bg, color: s.fg }}>
                  <s.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0A1128]">{s.value}</p>
            </div>
          ))}
        </div>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Posting Details</DialogTitle>
              <DialogDescription>
                {job.job_title}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderFormattedText(job.job_description)}
                </CardContent>
              </Card>

              {job.interview_questions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Interview Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderFormattedText(job.interview_questions, "No interview questions provided")}
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.experience_min_years && (
                      <div>
                        <p className="text-sm font-medium">Minimum Experience</p>
                        <p className="text-sm text-muted-foreground">
                          {job.experience_min_years} years
                        </p>
                      </div>
                    )}
                    {job.education_required && (
                      <div>
                        <p className="text-sm font-medium">Education</p>
                        <div
                          className="prose prose-sm max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: job.education_required }}
                        />
                      </div>
                    )}
                    {job.required_skills && (
                      <div>
                        <p className="text-sm font-medium">Required Skills</p>
                        <div
                          className="prose prose-sm max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: job.required_skills }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Total Applications</p>
                      <p className="text-2xl font-bold">{job.total_applications || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Shortlisted</p>
                      <p className="text-2xl font-bold text-green-600">
                        {job.shortlisted_count || 0}
                      </p>
                    </div>
                    {job.posted_date && (
                      <div>
                        <p className="text-sm font-medium">Posted Date</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.posted_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* APPLICANTS SECTION */}
        <section className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-[#E5E5E5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0A1128]">Applicants</h2>
              <p className="text-xs text-[#525252]">Move candidates through the hiring funnel.</p>
            </div>
            <div className="flex items-center gap-2">
              {isShortlistingInProgress ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: "#EFF6FF", color: "#034078", border: "1px solid #BFDBFE" }}
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reviewing CVs…
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0" }}
                >
                  <CheckCircle className="h-3 w-3" />
                  CV review complete
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadApplicants}
                    disabled={loadingApplicants}
                    aria-label="Refresh applicants"
                    className="h-8 w-8 text-[#525252] hover:bg-[#F5F5F5]"
                  >
                    <RefreshCw className={loadingApplicants ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Refresh applicants</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="p-5">
            {loadingApplicants ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto">
                  <TabsList className="inline-flex w-auto bg-[#F5F5F5]">
                    {ENROLLMENT_STAGES.map((stage) => {
                      const count = getCountByStage(stage.value)
                      return (
                        <TabsTrigger
                          key={stage.value}
                          value={stage.value}
                          className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#0A1128] data-[state=active]:shadow-sm"
                        >
                          <span>{stage.label}</span>
                          <span
                            className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ background: "rgba(3, 64, 120, 0.1)", color: "#034078" }}
                          >
                            {count}
                          </span>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </div>

                {ENROLLMENT_STAGES.map((stage) => (
                  <TabsContent key={stage.value} value={stage.value} className="mt-4">
                    {filteredApplicants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E5E5E5] bg-[#F9FAFB] px-6 py-12 text-center">
                        <Users className="h-7 w-7 text-[#A3A3A3]" />
                        <p className="text-sm font-semibold text-[#0A1128]">No applicants in this stage</p>
                        <p className="text-xs text-[#A3A3A3]">
                          {stage.value === "all"
                            ? "Once candidates apply, they will appear here."
                            : "Move candidates through the funnel to populate this view."}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-[#E5E5E5]">
                        <div className="hidden grid-cols-[2fr_140px_140px_180px_240px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
                          <div>Candidate</div>
                          <div>AI score</div>
                          <div>Applied</div>
                          <div>Status</div>
                          <div>Change status</div>
                        </div>
                        <ul className="divide-y divide-[#F0F0F0]">
                          {pagedApplicants.map((applicant) => {
                            const status = applicant.shortlist_status || "Not Reviewed"
                            const tone =
                              status === "Shortlisted" ? { dot: "#1282A2", text: "#034078", bg: "#EFF6FF", border: "#BFDBFE" }
                                : status === "Interview Scheduled" ? { dot: "#F97316", text: "#9A3412", bg: "#FFF7ED", border: "#FED7AA" }
                                  : status === "Interviewed" ? { dot: "#7C3AED", text: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" }
                                    : status === "Offered" ? { dot: "#28C76F", text: "#166534", bg: "#DCFCE7", border: "#BBF7D0" }
                                      : status === "Hired" ? { dot: "#28C76F", text: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" }
                                        : status === "Rejected" ? { dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2", border: "#FECACA" }
                                          : { dot: "#A3A3A3", text: "#525252", bg: "#F5F5F5", border: "#E5E5E5" }
                            const score = applicant.ai_score
                            const scoreTone =
                              score == null ? null
                                : score >= 80 ? { text: "#166534", bg: "#DCFCE7" }
                                  : score >= 60 ? { text: "#034078", bg: "#EFF6FF" }
                                    : score >= 40 ? { text: "#9A3412", bg: "#FFF7ED" }
                                      : { text: "#991B1B", bg: "#FEF2F2" }
                            const allowed = allowedOptionsFor(applicant.shortlist_status)
                            return (
                              <li
                                key={applicant.name}
                                className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[2fr_140px_140px_180px_240px] lg:items-center lg:gap-4"
                              >
                                <div className="min-w-0">
                                  <Link
                                    href={`/recruitment/candidates/application/${applicant.name}`}
                                    className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                                  >
                                    {applicant.candidate_name || applicant.name}
                                  </Link>
                                  {applicant.email && (
                                    <p className="truncate text-xs text-[#A3A3A3]">{applicant.email}</p>
                                  )}
                                </div>
                                <div>
                                  {status === "Not Reviewed" || score == null ? (
                                    <span className="text-sm text-[#A3A3A3]">—</span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
                                      style={{ background: scoreTone!.bg, color: scoreTone!.text }}
                                    >
                                      <Star className="h-3 w-3 fill-current" />
                                      {score.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-[#525252]">
                                  {applicant.application_date ? (
                                    new Date(applicant.application_date).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  ) : (
                                    <span className="text-[#A3A3A3]">—</span>
                                  )}
                                </div>
                                <div>
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                                    style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
                                    {status}
                                  </span>
                                </div>
                                <div>
                                  <Select
                                    value=""
                                    onValueChange={(value) => {
                                      if (!value) return
                                      handleStatusChange(
                                        applicant.name,
                                        applicant.shortlist_status ?? "Not Reviewed",
                                        value
                                      )
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-full border-[#E5E5E5] text-xs lg:w-[220px]">
                                      <SelectValue placeholder={allowed.length === 0 ? "No actions available" : "Choose action"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allowed.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                      {allowed.length === 0 && (
                                        <SelectItem value="no-actions" disabled>
                                          No actions available
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </li>
                            )
                          })}
                        </ul>

                        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2.5 sm:flex-row">
                          <p className="text-xs text-[#A3A3A3]">
                            Showing{" "}
                            <span className="font-semibold text-[#171717]">
                              {filteredApplicants.length === 0 ? 0 : applicantsPageStart + 1}
                            </span>
                            {"–"}
                            <span className="font-semibold text-[#171717]">
                              {Math.min(applicantsPageStart + APPLICANTS_PAGE_SIZE, filteredApplicants.length)}
                            </span>{" "}
                            of <span className="font-semibold text-[#171717]">{filteredApplicants.length}</span>
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setApplicantsPage((p) => Math.max(1, p - 1))}
                              disabled={applicantsSafePage === 1}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Previous page"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                              Prev
                            </button>
                            {applicantsPageWindow[0] > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApplicantsPage(1)}
                                  className="h-7 w-7 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                                >
                                  1
                                </button>
                                {applicantsPageWindow[0] > 2 && <span className="px-1 text-xs text-[#A3A3A3]">…</span>}
                              </>
                            )}
                            {applicantsPageWindow.map((n) => {
                              const active = n === applicantsSafePage
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setApplicantsPage(n)}
                                  className="h-7 w-7 rounded-lg border text-xs font-medium transition-colors"
                                  style={
                                    active
                                      ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                                      : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                                  }
                                >
                                  {n}
                                </button>
                              )
                            })}
                            {applicantsPageWindow[applicantsPageWindow.length - 1] < applicantsTotalPages && (
                              <>
                                {applicantsPageWindow[applicantsPageWindow.length - 1] < applicantsTotalPages - 1 && (
                                  <span className="px-1 text-xs text-[#A3A3A3]">…</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setApplicantsPage(applicantsTotalPages)}
                                  className="h-7 w-7 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                                >
                                  {applicantsTotalPages}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setApplicantsPage((p) => Math.min(applicantsTotalPages, p + 1))}
                              disabled={applicantsSafePage === applicantsTotalPages}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Next page"
                            >
                              Next
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </section>

      </div>

      <AlertDialog open={showRerunConfirm} onOpenChange={setShowRerunConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rerun Shortlisting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rerun the shortlisting process? This will reset the current shortlist assessment and re-evaluate all applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRerun}
              disabled={rerunningShortlist}
              className="bg-red-600 hover:bg-red-700"
            >
              {rerunningShortlist ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Rerun Shortlisting"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ ...errorDialog, open: false })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showInterviewQuestionsDialog} onOpenChange={setShowInterviewQuestionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invite to Interview</DialogTitle>
            <DialogDescription>
              Set up the categorized questions the AI interviewer will use. Each question must be tagged with one of the 10 categories so the candidate gets evaluated across every area.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col max-h-[75vh]">
            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interview_duration" className="text-[#0A1128]">
                    Interview Duration (minutes)
                  </Label>
                  <Input
                    id="interview_duration"
                    type="number"
                    min={1}
                    value={interviewDuration}
                    onChange={e => setInterviewDuration(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite_email" className="text-[#0A1128]">
                    Invitation Email
                  </Label>
                  <Input
                    id="invite_email"
                    type="email"
                    value={interviewInviteEmail}
                    onChange={(e) => setInterviewInviteEmail(e.target.value)}
                    placeholder="candidate@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[#0A1128]">Interview Questions</Label>
                </div>
                <CategorizedQuestionsEditor
                  questions={interviewQuestions}
                  onChange={setInterviewQuestions}
                />
                <p className="text-xs text-muted-foreground pt-1">
                  The AI interviewer will ask these questions and score the candidate per category.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInterviewQuestionsDialog(false)
                  setPendingStatusChange(null)
                  setInterviewInviteEmail("")
                }}
                disabled={submittingQuestions}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmInterviewQuestions}
                disabled={submittingQuestions}
              >
                {submittingQuestions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Interview Invitation"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}

export default function JobDetailPage() {
  return <HrJobDetailPage />
}