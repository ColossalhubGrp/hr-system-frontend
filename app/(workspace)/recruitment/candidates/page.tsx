"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Award,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Search,
    Star,
    Users,
} from "lucide-react"
import type { CandidateApplication, JobPosting } from "@/lib/recruitment/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function StatChip({
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    "all",
    "Not Reviewed",
    "Shortlisted",
    "Interview Scheduled",
    "Interviewed",
    "Offered",
    "Hired",
    "Rejected",
]

export default function CandidatesPage() {
    const router = useRouter()
    const [candidates, setCandidates] = useState<CandidateApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [jobs, setJobs] = useState<JobPosting[]>([])
    const [jobFilter, setJobFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const result = await apiClient.getJobPostings()
                setJobs(result.data || [])
            } catch (error) {
                console.error("Failed to load job postings:", error)
            }
        }
        loadJobs()
    }, [])

    useEffect(() => {
        const loadCandidates = async () => {
            try {
                setLoading(true)
                const result = await apiClient.getCandidateApplications(
                    jobFilter !== "all" ? jobFilter : undefined,
                    statusFilter !== "all" ? statusFilter : undefined
                )
                setCandidates(result.data || [])
                setPage(1)
            } catch (error) {
                console.error("Failed to load candidates:", error)
            } finally {
                setLoading(false)
            }
        }
        loadCandidates()
    }, [statusFilter, jobFilter])

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        if (!q) return candidates
        return candidates.filter((c) => {
            return (
                c.candidate_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.job_posting?.toLowerCase().includes(q) ||
                c.job_title?.toLowerCase().includes(q)
            )
        })
    }, [candidates, searchTerm])

    const counts = useMemo(() => {
        return {
            total: candidates.length,
            notReviewed: candidates.filter((c) => c.shortlist_status === "Not Reviewed").length,
            shortlisted: candidates.filter((c) => c.shortlist_status === "Shortlisted").length,
            hired: candidates.filter((c) => c.shortlist_status === "Hired").length,
        }
    }, [candidates])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    // Reset page when filters / search shrink the result set below current page.
    useEffect(() => {
        if (page > totalPages) setPage(totalPages)
    }, [page, totalPages])

    const pageNumbers = useMemo(() => {
        // Show up to 5 page buttons centered on current page.
        const max = 5
        let from = Math.max(1, safePage - Math.floor(max / 2))
        let to = Math.min(totalPages, from + max - 1)
        if (to - from + 1 < max) from = Math.max(1, to - max + 1)
        const list = []
        for (let i = from; i <= to; i++) list.push(i)
        return list
    }, [safePage, totalPages])

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-12">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Recruitment</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Candidates</h1>
                        <p className="mt-1 text-sm text-[#525252]">
                            Every application across every open role — filter, search, and dive into a profile.
                        </p>
                    </div>
                    <Button asChild className="bg-[#034078] hover:bg-[#0A1128] text-white">
                        <Link href="/recruitment/candidates/upload">Upload CVs</Link>
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatChip label="Total" value={counts.total} icon={Users} tone="gray" />
                    <StatChip label="Not reviewed" value={counts.notReviewed} icon={Clock} tone="amber" />
                    <StatChip label="Shortlisted" value={counts.shortlisted} icon={Award} tone="brand" />
                    <StatChip label="Hired" value={counts.hired} icon={CheckCircle2} tone="emerald" />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                        <Input
                            placeholder="Search by name, email, or position…"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setPage(1)
                            }}
                            className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select
                            value={jobFilter}
                            onValueChange={(v) => {
                                setJobFilter(v)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="border-[#E5E5E5] sm:w-[260px]">
                                <SelectValue placeholder="All jobs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All jobs</SelectItem>
                                {jobs.map((job) => (
                                    <SelectItem key={job.name} value={job.name}>
                                        {job.job_title || "Untitled job"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={pageSize === 10 ? "10" : pageSize === 25 ? "25" : "50"}
                            onValueChange={(v) => {
                                setPageSize(Number(v))
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="border-[#E5E5E5] sm:w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 / page</SelectItem>
                                <SelectItem value="25">25 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Status filter chips */}
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                        const active = statusFilter === opt
                        const label = opt === "all" ? "All statuses" : opt
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(opt)
                                    setPage(1)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                                style={
                                    active
                                        ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                                        : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                                }
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#034078]">
                            <Users className="h-5 w-5" />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#0A1128]">
                            {candidates.length === 0 ? "No candidates yet" : "Nothing matches your filters"}
                        </p>
                        <p className="max-w-sm text-xs text-[#A3A3A3]">
                            {candidates.length === 0
                                ? "Upload CVs to populate your candidate pool."
                                : "Try a different status or job, or clear your search."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                            {/* Table header — desktop */}
                            <div className="hidden grid-cols-[2fr_1.6fr_160px_120px_140px_80px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
                                <div>Candidate</div>
                                <div>Position</div>
                                <div>Status</div>
                                <div>AI score</div>
                                <div>Applied</div>
                                <div className="text-right">
                                    <span className="sr-only">Action</span>
                                </div>
                            </div>

                            <ul className="divide-y divide-[#F0F0F0]">
                                {paged.map((c) => {
                                    const href = `/recruitment/candidates/profile/${encodeURIComponent(c.email || "unknown")}`
                                    return (
                                        <li
                                            key={c.name}
                                            className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[2fr_1.6fr_160px_120px_140px_80px] lg:items-center lg:gap-4"
                                        >
                                            {/* Candidate */}
                                            <div className="min-w-0">
                                                <Link
                                                    href={href}
                                                    className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                                                >
                                                    {c.candidate_name || "Unknown"}
                                                </Link>
                                                {c.email && (
                                                    <p className="truncate text-xs text-[#A3A3A3]">{c.email}</p>
                                                )}
                                            </div>

                                            {/* Position */}
                                            <div className="min-w-0 text-sm text-[#525252]">
                                                <p className="truncate">{c.job_title || "—"}</p>
                                            </div>

                                            {/* Status */}
                                            <div className="text-sm">
                                                <StatusPill status={c.shortlist_status} />
                                            </div>

                                            {/* Score */}
                                            <div className="text-sm">
                                                <ScoreBadge
                                                    score={c.shortlist_status === "Not Reviewed" ? null : c.ai_score}
                                                />
                                            </div>

                                            {/* Applied */}
                                            <div className="text-sm text-[#525252]">
                                                {c.application_date ? (
                                                    new Date(c.application_date).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })
                                                ) : (
                                                    <span className="text-[#A3A3A3]">—</span>
                                                )}
                                            </div>

                                            {/* Action */}
                                            <div className="text-sm font-medium lg:text-right">
                                                <Link
                                                    href={href}
                                                    className="font-semibold text-[#034078] hover:text-[#0A1128]"
                                                >
                                                    View
                                                    <span className="sr-only">, {c.candidate_name || "candidate"}</span>
                                                </Link>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>

                            {/* Pagination footer */}
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E5E5E5] bg-[#F9FAFB] px-5 py-3 sm:flex-row">
                                <p className="text-xs text-[#A3A3A3]">
                                    Showing{" "}
                                    <span className="font-semibold text-[#171717]">{start + 1}</span>–
                                    <span className="font-semibold text-[#171717]">
                                        {Math.min(start + pageSize, filtered.length)}
                                    </span>{" "}
                                    of <span className="font-semibold text-[#171717]">{filtered.length}</span>
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Prev
                                    </button>
                                    {pageNumbers[0] > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setPage(1)}
                                                className="h-8 w-8 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                                            >
                                                1
                                            </button>
                                            {pageNumbers[0] > 2 && <span className="px-1 text-xs text-[#A3A3A3]">…</span>}
                                        </>
                                    )}
                                    {pageNumbers.map((n) => {
                                        const active = n === safePage
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setPage(n)}
                                                className="h-8 w-8 rounded-lg border text-xs font-medium transition-colors"
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
                                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                                        <>
                                            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                                <span className="px-1 text-xs text-[#A3A3A3]">…</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setPage(totalPages)}
                                                className="h-8 w-8 rounded-lg border border-[#E5E5E5] bg-white text-xs font-medium text-[#525252] hover:bg-[#F5F5F5]"
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safePage === totalPages}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
                                        aria-label="Next page"
                                    >
                                        Next
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    )
}
