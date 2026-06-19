"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Briefcase,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Download,
    FileText,
    LayoutGrid,
    Mail,
    Phone,
    Printer,
    Sparkles,
    Table2,
    Users,
    XCircle,
} from "lucide-react"
import type { ShortlistReport, ShortlistedCandidate } from "@/lib/recruitment/types"

// ─── Field definitions ────────────────────────────────────────────────────────

const initialFields = {
    candidate: true,
    name: true,
    email: true,
    ai_score: true,
    phone: false,
    key_skills_matched: true,
    education: false,
    experience_match: false,
    years_of_experience: false,
    cv_summary: true,
    recommendation: true,
    skills_assessment: true,
    experience_evaluation: true,
    education_background: true,
    overall_fit_analysis: true,
    key_strengths: true,
    potential_concerns: true,
    analyst_notes: false,
}
type FieldKey = keyof typeof initialFields

const fieldLabels: Record<FieldKey, string> = {
    candidate: "Candidate",
    name: "Name",
    email: "Email",
    phone: "Phone",
    ai_score: "AI Score",
    key_skills_matched: "Key Skills",
    education: "Education",
    experience_match: "Experience Match",
    years_of_experience: "Years",
    cv_summary: "CV Summary",
    recommendation: "Recommendation",
    skills_assessment: "Skills Assessment",
    experience_evaluation: "Experience Evaluation",
    education_background: "Educational Background",
    overall_fit_analysis: "Overall Fit Analysis",
    key_strengths: "Key Strengths",
    potential_concerns: "Potential Concerns",
    analyst_notes: "Notes",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function humanizeJobPosting(raw?: string | null): string {
    if (!raw) return ""
    if (!/^[A-Z]+-/.test(raw)) return raw
    const parts = raw.split("-")
    return (
        parts
            .slice(1)
            .filter((p) => !/^\d{6,}$/.test(p))
            .join(" ")
            .trim() || raw
    )
}

function scoreColor(score?: number | null): string {
    if (score == null) return "#A3A3A3"
    if (score >= 80) return "#28C76F"
    if (score >= 60) return "#1282A2"
    if (score >= 40) return "#F97316"
    return "#EF4444"
}

function recommendationStyle(rec?: string) {
    const v = (rec || "").toLowerCase()
    if (v.includes("strong hire")) return { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" }
    if (v.includes("hire")) return { bg: "#EFF6FF", text: "#034078", border: "#BFDBFE" }
    if (v.includes("interview")) return { bg: "#EFF6FF", text: "#034078", border: "#BFDBFE" }
    if (v.includes("maybe") || v.includes("on hold")) return { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" }
    if (v.includes("reject")) return { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" }
    return { bg: "#F5F5F5", text: "#525252", border: "#E5E5E5" }
}

// ─── Score helpers (read either ai_analysis or ai_analysis_summary) ──────────

const getCandidateRecommendation = (c: ShortlistedCandidate) =>
    c.recommendation || c.ai_analysis?.recommendation || c.ai_analysis_summary?.recommendation || ""
const getSkillsScore = (c: ShortlistedCandidate) =>
    c.ai_analysis?.skills_match_score ?? c.ai_analysis_summary?.skills_match?.score
const getSkillsDescription = (c: ShortlistedCandidate) =>
    c.ai_analysis?.skills_match_description || c.ai_analysis_summary?.skills_match?.description || ""
const getExperienceScore = (c: ShortlistedCandidate) =>
    c.ai_analysis?.experience_match_score ?? c.ai_analysis_summary?.experience_match?.score
const getExperienceDescription = (c: ShortlistedCandidate) =>
    c.ai_analysis?.experience_match_description || c.ai_analysis_summary?.experience_match?.description || ""
const getEducationScore = (c: ShortlistedCandidate) =>
    c.ai_analysis?.education_match_score ?? c.ai_analysis_summary?.education_match?.score
const getEducationDescription = (c: ShortlistedCandidate) =>
    c.ai_analysis?.education_match_description || c.ai_analysis_summary?.education_match?.description || ""
const getOverallFitScore = (c: ShortlistedCandidate) =>
    c.ai_analysis?.overall_fit_score ?? c.ai_analysis_summary?.overall_fit?.score
const getOverallFitDescription = (c: ShortlistedCandidate) =>
    c.ai_analysis?.overall_fit_description || c.ai_analysis_summary?.overall_fit?.description || ""
const getKeyStrengths = (c: ShortlistedCandidate) =>
    c.ai_analysis?.key_strengths || c.ai_analysis_summary?.key_strengths || []
const getPotentialConcerns = (c: ShortlistedCandidate) =>
    c.ai_analysis?.potential_concerns || c.ai_analysis_summary?.potential_concerns || []
const getAnalysisNotes = (c: ShortlistedCandidate) =>
    c.ai_analysis?.notes || c.ai_analysis_summary?.notes || ""

// ─── Bits ─────────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
    const radius = 28
    const stroke = 6
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - Math.min(1, Math.max(0, score / 100)))
    const color = scoreColor(score)
    return (
        <div className="relative inline-flex h-16 w-16 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={radius} stroke="#F0F0F0" strokeWidth={stroke} fill="none" />
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
            </svg>
            <div className="text-center leading-none">
                <div className="text-base font-bold" style={{ color }}>
                    {Math.round(score)}
                </div>
                <div className="text-[8px] uppercase tracking-wide text-[#A3A3A3]">/ 100</div>
            </div>
        </div>
    )
}

function ScoreBar({
    label,
    score,
    description,
    accent,
}: {
    label: string
    score: number | null | undefined
    description?: string
    accent: { color: string; bg: string; bar: string; border: string }
}) {
    const pct = score != null ? Math.min(100, Math.max(0, score)) : 0
    return (
        <div className="rounded-xl border p-4" style={{ background: accent.bg, borderColor: accent.border }}>
            <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent.color }}>
                    {label}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: accent.color }}>
                    {score != null ? score : "—"}
                    <span className="text-xs font-normal opacity-70">/100</span>
                </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: accent.border }}>
                <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%`, background: accent.bar }}
                />
            </div>
            {description && <p className="mt-2.5 text-sm leading-relaxed text-[#525252]">{description}</p>}
        </div>
    )
}

const SCORE_VARIANTS = {
    skills: { color: "#034078", bar: "#034078", bg: "#EFF6FF", border: "#BFDBFE" },
    experience: { color: "#92400E", bar: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
    education: { color: "#5B21B6", bar: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    overall: { color: "#065F46", bar: "#28C76F", bg: "#ECFDF5", border: "#A7F3D0" },
}

function StatChip({
    label,
    value,
    icon: Icon,
}: {
    label: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
}) {
    return (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#525252]">
                    <Icon className="h-3.5 w-3.5" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0A1128]">{value}</p>
        </div>
    )
}

function ToggleButton({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active: boolean
    onClick: () => void
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
            style={
                active ? { background: "#034078", color: "#fff" } : { background: "#fff", color: "#525252" }
            }
        >
            <Icon className="h-3.5 w-3.5" />
            {children}
        </button>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [report, setReport] = useState<ShortlistReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
    const [candidateLimit, setCandidateLimit] = useState<number>(10)
    const [selectedFields, setSelectedFields] = useState<Record<FieldKey, boolean>>(initialFields)
    const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({
        open: false,
        title: "",
        message: "",
    })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        if (params.id) loadReport(params.id as string)
    }, [router, params.id])

    const loadReport = async (id: string) => {
        try {
            setReport(await apiClient.getShortlistReport(id))
        } catch (error: any) {
            setErrorDialog({
                open: true,
                title: "Failed to load report",
                message: error.message || "Redirecting…",
            })
            setTimeout(() => router.push("/recruitment/reports"), 2500)
        } finally {
            setLoading(false)
        }
    }

    const handleFieldToggle = (field: FieldKey) =>
        setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }))

    const allFieldsSelected = useMemo(() => Object.values(selectedFields).every(Boolean), [selectedFields])
    const handleSelectAll = () => {
        const next = !allFieldsSelected
        const newState = {} as Record<FieldKey, boolean>
        ;(Object.keys(selectedFields) as FieldKey[]).forEach((k) => {
            newState[k] = next
        })
        setSelectedFields(newState)
    }

    const exportToPDF = () => window.print()

    const exportToCSV = () => {
        if (!report?.candidates) return
        const headers: string[] = []
        if (selectedFields.name) headers.push("Name")
        if (selectedFields.email) headers.push("Email")
        if (selectedFields.phone) headers.push("Phone")
        if (selectedFields.ai_score) headers.push("AI Score")
        if (selectedFields.key_skills_matched) headers.push("Key Skills")
        if (selectedFields.education) headers.push("Education")
        if (selectedFields.experience_match) headers.push("Experience Match")
        if (selectedFields.years_of_experience) headers.push("Years of Experience")
        if (selectedFields.recommendation) headers.push("Recommendation")
        if (selectedFields.skills_assessment) headers.push("Skills Assessment")
        if (selectedFields.experience_evaluation) headers.push("Experience Evaluation")
        if (selectedFields.education_background) headers.push("Educational Background")
        if (selectedFields.overall_fit_analysis) headers.push("Overall Fit Analysis")
        if (selectedFields.key_strengths) headers.push("Key Strengths")
        if (selectedFields.potential_concerns) headers.push("Potential Concerns")
        if (selectedFields.analyst_notes) headers.push("Notes")
        const rows = report.candidates.slice(0, candidateLimit).map((c) => {
            const row: string[] = []
            if (selectedFields.name) row.push(`"${c.candidate_name || ""}"`)
            if (selectedFields.email) row.push(`"${c.email || ""}"`)
            if (selectedFields.phone) row.push(`"${c.phone || ""}"`)
            if (selectedFields.ai_score) row.push(String(c.ai_score || ""))
            if (selectedFields.key_skills_matched) row.push(`"${c.key_skills_matched || ""}"`)
            if (selectedFields.education) row.push(`"${c.education || ""}"`)
            if (selectedFields.experience_match) row.push(`"${c.experience_match || ""}"`)
            if (selectedFields.years_of_experience) row.push(`"${c.years_of_experience || ""}"`)
            if (selectedFields.recommendation) row.push(`"${getCandidateRecommendation(c)}"`)
            if (selectedFields.skills_assessment) row.push(`"${getSkillsDescription(c)}"`)
            if (selectedFields.experience_evaluation) row.push(`"${getExperienceDescription(c)}"`)
            if (selectedFields.education_background) row.push(`"${getEducationDescription(c)}"`)
            if (selectedFields.overall_fit_analysis) row.push(`"${getOverallFitDescription(c)}"`)
            if (selectedFields.key_strengths) row.push(`"${getKeyStrengths(c).join(" | ")}"`)
            if (selectedFields.potential_concerns) row.push(`"${getPotentialConcerns(c).join(" | ")}"`)
            if (selectedFields.analyst_notes) row.push(`"${getAnalysisNotes(c)}"`)
            return row.join(",")
        })
        const csv = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${report.report_name || "shortlist-report"}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
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

    if (!report) {
        return (
            <MainLayout>
                <div className="max-w-4xl">
                    <Link href="/recruitment/reports" className="inline-flex items-center gap-1.5 text-sm text-[#034078] hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Back to reports
                    </Link>
                    <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#E5E5E5] bg-white p-5">
                        <FileText className="h-5 w-5 text-[#A3A3A3]" />
                        <p className="text-sm text-[#525252]">Report not found.</p>
                    </div>
                </div>
            </MainLayout>
        )
    }

    const totalApps = report.total_applications || 0
    const shortlistedCount = report.shortlisted_count || 0
    const candidateCount = report.candidates?.length || 0
    const selRate = totalApps > 0 ? (shortlistedCount / totalApps) * 100 : null
    const jobLabel = humanizeJobPosting(report.job_posting)
    const rendered = report.candidates?.slice(0, candidateLimit) || []

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-20">
                {/* Top bar */}
                <div className="flex items-center justify-between no-print">
                    <Link
                        href="/recruitment/reports"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Reports
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportToCSV}
                            className="border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            CSV
                        </Button>
                        <Button
                            size="sm"
                            onClick={exportToPDF}
                            className="bg-[#034078] hover:bg-[#0A1128] text-white"
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print / PDF
                        </Button>
                    </div>
                </div>

                {/* Hero */}
                <header className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-6">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Shortlist report</p>
                            <h1 className="mt-1 text-2xl font-bold text-[#0A1128] sm:text-[28px]">
                                {report.report_name}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A3A3A3]">
                                {jobLabel && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5" /> {jobLabel}
                                    </span>
                                )}
                                {report.generated_at && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Generated {new Date(report.generated_at).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                )}
                            </div>
                            {report.report_summary && (
                                <p className="mt-3 text-sm leading-relaxed text-[#525252]">{report.report_summary}</p>
                            )}
                        </div>
                    </div>
                </header>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatChip label="Applications" value={totalApps} icon={Users} />
                    <StatChip label="Shortlisted" value={shortlistedCount} icon={CheckCircle2} />
                    <StatChip
                        label="Selection rate"
                        value={selRate == null ? "—" : `${selRate.toFixed(1)}%`}
                        icon={Award}
                    />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between no-print">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E5E5]">
                            <ToggleButton
                                active={viewMode === "cards"}
                                onClick={() => setViewMode("cards")}
                                icon={LayoutGrid}
                            >
                                Cards
                            </ToggleButton>
                            <span className="w-px bg-[#E5E5E5]" aria-hidden="true" />
                            <ToggleButton
                                active={viewMode === "table"}
                                onClick={() => setViewMode("table")}
                                icon={Table2}
                            >
                                Table
                            </ToggleButton>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs font-semibold text-[#A3A3A3]">Show</span>
                            <input
                                type="number"
                                min={1}
                                max={candidateCount || 100}
                                value={candidateLimit}
                                onChange={(e) =>
                                    setCandidateLimit(Math.max(1, Number(e.target.value) || 1))
                                }
                                className="h-8 w-16 rounded-md border border-[#E5E5E5] bg-white px-2 text-center text-sm text-[#171717] outline-none focus:border-[#034078]"
                            />
                            <span className="text-xs text-[#A3A3A3]">of {candidateCount}</span>
                        </div>
                    </div>
                    <details className="group relative">
                        <summary className="cursor-pointer list-none rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-medium text-[#525252] inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]">
                            <FileText className="h-3.5 w-3.5" />
                            Fields ({Object.values(selectedFields).filter(Boolean).length})
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="absolute right-0 top-full z-30 mt-2 w-[min(520px,calc(100vw-2rem))] rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-xl">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-[#0A1128]">Fields to include</p>
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-xs font-medium text-[#034078] hover:underline"
                                >
                                    {allFieldsSelected ? "Deselect all" : "Select all"}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                {(Object.keys(initialFields) as FieldKey[]).map((key) => {
                                    const active = selectedFields[key]
                                    return (
                                        <label
                                            key={key}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
                                            style={
                                                active
                                                    ? { background: "#EFF6FF", color: "#034078", fontWeight: 600 }
                                                    : { color: "#525252" }
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => handleFieldToggle(key)}
                                                className="h-3.5 w-3.5 accent-[#034078]"
                                                disabled={key === "candidate"}
                                            />
                                            {fieldLabels[key]}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    </details>
                </div>

                {/* Section heading for the candidate list */}
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-[#0A1128]">
                        Shortlisted candidates
                        <span className="ml-2 text-sm font-normal text-[#A3A3A3]">
                            {candidateCount > 0 ? `${rendered.length} of ${candidateCount}` : "0"}
                        </span>
                    </h2>
                </div>

                {/* List / table */}
                {candidateCount === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                        <Users className="h-8 w-8 text-[#A3A3A3]" />
                        <p className="text-sm font-semibold text-[#0A1128]">No candidates in this report</p>
                        <p className="text-sm text-[#A3A3A3]">The shortlist returned zero candidates.</p>
                    </div>
                ) : viewMode === "table" ? (
                    <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-sm font-semibold text-[#0A1128]">#</TableHead>
                                        {selectedFields.name && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Candidate</TableHead>
                                        )}
                                        {selectedFields.email && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Email</TableHead>
                                        )}
                                        {selectedFields.phone && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Phone</TableHead>
                                        )}
                                        {selectedFields.ai_score && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Score</TableHead>
                                        )}
                                        {selectedFields.recommendation && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Recommendation</TableHead>
                                        )}
                                        {selectedFields.key_skills_matched && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Key Skills</TableHead>
                                        )}
                                        {selectedFields.education && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Education</TableHead>
                                        )}
                                        {selectedFields.experience_match && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Experience</TableHead>
                                        )}
                                        {selectedFields.years_of_experience && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Years</TableHead>
                                        )}
                                        {selectedFields.cv_summary && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">CV Summary</TableHead>
                                        )}
                                        {selectedFields.skills_assessment && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Skills</TableHead>
                                        )}
                                        {selectedFields.experience_evaluation && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Experience eval.</TableHead>
                                        )}
                                        {selectedFields.education_background && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Edu. background</TableHead>
                                        )}
                                        {selectedFields.overall_fit_analysis && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Overall fit</TableHead>
                                        )}
                                        {selectedFields.key_strengths && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Strengths</TableHead>
                                        )}
                                        {selectedFields.potential_concerns && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Concerns</TableHead>
                                        )}
                                        {selectedFields.analyst_notes && (
                                            <TableHead className="text-sm font-semibold text-[#0A1128]">Notes</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rendered.map((c, i) => {
                                        const rec = getCandidateRecommendation(c)
                                        const recStyle = recommendationStyle(rec)
                                        return (
                                            <TableRow key={c.candidate} className="align-top">
                                                <TableCell className="text-sm text-[#A3A3A3]">{i + 1}</TableCell>
                                                {selectedFields.name && (
                                                    <TableCell>
                                                        <span className="text-sm font-semibold text-[#0A1128]">
                                                            {c.candidate_name}
                                                        </span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.email && (
                                                    <TableCell className="text-sm text-[#525252]">{c.email || "—"}</TableCell>
                                                )}
                                                {selectedFields.phone && (
                                                    <TableCell className="text-sm text-[#525252]">{c.phone || "—"}</TableCell>
                                                )}
                                                {selectedFields.ai_score && (
                                                    <TableCell>
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
                                                            style={{ color: scoreColor(c.ai_score), background: "#F5F5F5" }}
                                                        >
                                                            {(c.ai_score ?? 0).toFixed(1)}
                                                        </span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.recommendation && (
                                                    <TableCell>
                                                        {rec ? (
                                                            <span
                                                                className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                                                                style={{
                                                                    background: recStyle.bg,
                                                                    color: recStyle.text,
                                                                    border: `1px solid ${recStyle.border}`,
                                                                }}
                                                            >
                                                                {rec}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-[#A3A3A3]">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {selectedFields.key_skills_matched && (
                                                    <TableCell className="min-w-[180px] text-sm text-[#525252]">
                                                        {c.key_skills_matched || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.education && (
                                                    <TableCell className="min-w-[160px] text-sm text-[#525252]">
                                                        {c.education || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.experience_match && (
                                                    <TableCell className="min-w-[160px] text-sm text-[#525252]">
                                                        {c.experience_match || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.years_of_experience && (
                                                    <TableCell className="text-sm text-[#525252]">
                                                        {c.years_of_experience || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.cv_summary && (
                                                    <TableCell className="min-w-[220px] text-sm text-[#525252]">
                                                        {c.cv_summary || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.skills_assessment && (
                                                    <TableCell className="min-w-[200px]">
                                                        {getSkillsScore(c) != null && (
                                                            <span className="mr-1 text-sm font-semibold" style={{ color: SCORE_VARIANTS.skills.color }}>
                                                                {getSkillsScore(c)}/100 —
                                                            </span>
                                                        )}
                                                        <span className="text-sm text-[#525252]">{getSkillsDescription(c) || "—"}</span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.experience_evaluation && (
                                                    <TableCell className="min-w-[200px]">
                                                        {getExperienceScore(c) != null && (
                                                            <span className="mr-1 text-sm font-semibold" style={{ color: SCORE_VARIANTS.experience.color }}>
                                                                {getExperienceScore(c)}/100 —
                                                            </span>
                                                        )}
                                                        <span className="text-sm text-[#525252]">{getExperienceDescription(c) || "—"}</span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.education_background && (
                                                    <TableCell className="min-w-[200px]">
                                                        {getEducationScore(c) != null && (
                                                            <span className="mr-1 text-sm font-semibold" style={{ color: SCORE_VARIANTS.education.color }}>
                                                                {getEducationScore(c)}/100 —
                                                            </span>
                                                        )}
                                                        <span className="text-sm text-[#525252]">{getEducationDescription(c) || "—"}</span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.overall_fit_analysis && (
                                                    <TableCell className="min-w-[200px]">
                                                        {getOverallFitScore(c) != null && (
                                                            <span className="mr-1 text-sm font-semibold" style={{ color: SCORE_VARIANTS.overall.color }}>
                                                                {getOverallFitScore(c)}/100 —
                                                            </span>
                                                        )}
                                                        <span className="text-sm text-[#525252]">{getOverallFitDescription(c) || "—"}</span>
                                                    </TableCell>
                                                )}
                                                {selectedFields.key_strengths && (
                                                    <TableCell className="min-w-[200px] text-sm text-[#525252]">
                                                        {getKeyStrengths(c).join(", ") || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.potential_concerns && (
                                                    <TableCell className="min-w-[200px] text-sm text-[#525252]">
                                                        {getPotentialConcerns(c).join(", ") || "—"}
                                                    </TableCell>
                                                )}
                                                {selectedFields.analyst_notes && (
                                                    <TableCell className="min-w-[200px] text-sm text-[#525252]">
                                                        {getAnalysisNotes(c) || "—"}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {rendered.map((candidate, index) => {
                            const rec = getCandidateRecommendation(candidate)
                            const recStyle = recommendationStyle(rec)
                            const aiScore = candidate.ai_score ?? null
                            const strengths = getKeyStrengths(candidate)
                            const concerns = getPotentialConcerns(candidate)
                            const hasScoreTiles =
                                selectedFields.skills_assessment ||
                                selectedFields.experience_evaluation ||
                                selectedFields.education_background ||
                                selectedFields.overall_fit_analysis
                            return (
                                <article
                                    key={candidate.candidate}
                                    className="break-inside-avoid overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm"
                                >
                                    <header className="flex items-center gap-3 border-b border-[#E5E5E5] bg-[#F9FAFB] px-5 py-4">
                                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full border border-[#E5E5E5] bg-white px-2 text-xs font-semibold text-[#525252]">
                                            #{index + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            {selectedFields.name && (
                                                <h3 className="truncate text-base font-semibold text-[#0A1128]">
                                                    {candidate.candidate_name}
                                                </h3>
                                            )}
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#A3A3A3]">
                                                {selectedFields.email && candidate.email && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {candidate.email}
                                                    </span>
                                                )}
                                                {selectedFields.phone && candidate.phone && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {candidate.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedFields.ai_score && aiScore != null && <ScoreRing score={aiScore} />}
                                    </header>

                                    <div className="space-y-5 p-5">
                                        {selectedFields.recommendation && rec && (
                                            <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: recStyle.bg, border: `1px solid ${recStyle.border}` }}>
                                                <span
                                                    className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                                    style={{ background: recStyle.text, color: "#fff" }}
                                                >
                                                    Recommendation
                                                </span>
                                                <span className="text-sm font-medium" style={{ color: recStyle.text }}>
                                                    {rec}
                                                </span>
                                            </div>
                                        )}

                                        {selectedFields.cv_summary && candidate.cv_summary && (
                                            <Section label="CV Summary">{candidate.cv_summary}</Section>
                                        )}

                                        {selectedFields.key_skills_matched && candidate.key_skills_matched && (
                                            <Section label="Key Skills">{candidate.key_skills_matched}</Section>
                                        )}

                                        {(selectedFields.experience_match || selectedFields.years_of_experience) &&
                                            (candidate.experience_match || candidate.years_of_experience) && (
                                                <Section label="Experience">
                                                    <>
                                                        {selectedFields.experience_match && candidate.experience_match}
                                                        {selectedFields.years_of_experience && candidate.years_of_experience && (
                                                            <p className="mt-1 text-xs text-[#A3A3A3]">
                                                                <span className="font-semibold text-[#171717]">{candidate.years_of_experience}</span>{" "}
                                                                years of experience
                                                            </p>
                                                        )}
                                                    </>
                                                </Section>
                                            )}

                                        {selectedFields.education && candidate.education && (
                                            <Section label="Education">{candidate.education}</Section>
                                        )}

                                        {hasScoreTiles && (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {selectedFields.skills_assessment && getSkillsDescription(candidate) && (
                                                    <ScoreBar
                                                        label="Skills"
                                                        score={getSkillsScore(candidate)}
                                                        description={getSkillsDescription(candidate)}
                                                        accent={SCORE_VARIANTS.skills}
                                                    />
                                                )}
                                                {selectedFields.experience_evaluation &&
                                                    getExperienceDescription(candidate) && (
                                                        <ScoreBar
                                                            label="Experience"
                                                            score={getExperienceScore(candidate)}
                                                            description={getExperienceDescription(candidate)}
                                                            accent={SCORE_VARIANTS.experience}
                                                        />
                                                    )}
                                                {selectedFields.education_background &&
                                                    getEducationDescription(candidate) && (
                                                        <ScoreBar
                                                            label="Education"
                                                            score={getEducationScore(candidate)}
                                                            description={getEducationDescription(candidate)}
                                                            accent={SCORE_VARIANTS.education}
                                                        />
                                                    )}
                                                {selectedFields.overall_fit_analysis &&
                                                    getOverallFitDescription(candidate) && (
                                                        <ScoreBar
                                                            label="Overall fit"
                                                            score={getOverallFitScore(candidate)}
                                                            description={getOverallFitDescription(candidate)}
                                                            accent={SCORE_VARIANTS.overall}
                                                        />
                                                    )}
                                            </div>
                                        )}

                                        {(selectedFields.key_strengths && strengths.length > 0) ||
                                        (selectedFields.potential_concerns && concerns.length > 0) ? (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {selectedFields.key_strengths && strengths.length > 0 && (
                                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                                                        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Strengths
                                                        </p>
                                                        <ul className="space-y-1">
                                                            {strengths.map((s, idx) => (
                                                                <li key={idx} className="flex gap-2 text-sm text-[#171717]">
                                                                    <span className="text-emerald-500">•</span>
                                                                    <span>{s}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {selectedFields.potential_concerns && concerns.length > 0 && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                                                        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                                            <XCircle className="h-3.5 w-3.5 text-amber-600" /> Concerns
                                                        </p>
                                                        <ul className="space-y-1">
                                                            {concerns.map((c, idx) => (
                                                                <li key={idx} className="flex gap-2 text-sm text-[#171717]">
                                                                    <span className="text-amber-500">•</span>
                                                                    <span>{c}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        {selectedFields.analyst_notes && getAnalysisNotes(candidate) && (
                                            <Section label="Notes">{getAnalysisNotes(candidate)}</Section>
                                        )}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#A3A3A3] pt-4 no-print">
                    <span>
                        Showing {rendered.length} of {candidateCount}
                    </span>
                    <span>© {new Date().getFullYear()} Recruitment Platform</span>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    :global(.no-print) {
                        display: none !important;
                    }
                    :global(body) {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                    :global(.break-inside-avoid) {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>

            <AlertDialog
                open={errorDialog.open}
                onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#EF4444]">
                            <AlertCircle className="h-5 w-5" />
                            {errorDialog.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setErrorDialog({ ...errorDialog, open: false })}
                        >
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
            <div className="text-sm leading-relaxed text-[#525252]">{children}</div>
        </div>
    )
}
