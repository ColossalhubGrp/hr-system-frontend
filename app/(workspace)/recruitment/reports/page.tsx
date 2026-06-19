"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/recruitment/api-client"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    PieChart,
    Search,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    Users,
} from "lucide-react"
import type { ShortlistReport } from "@/lib/recruitment/types"
import ConfirmDelete from "@/components/recruitment/common/ConfirmDelete"

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatDateRelative(date?: string | null): string {
    if (!date) return "—"
    const d = new Date(date.replace(" ", "T"))
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

function selectionRate(shortlisted: number, total: number): number | null {
    if (!total || total <= 0) return null
    return (shortlisted / total) * 100
}

function rateTone(rate: number | null) {
    if (rate == null) return { text: "#A3A3A3", bg: "#F5F5F5", bar: "#E5E5E5" }
    if (rate >= 30) return { text: "#166534", bg: "#DCFCE7", bar: "#28C76F" }
    if (rate >= 15) return { text: "#034078", bg: "#EFF6FF", bar: "#1282A2" }
    if (rate >= 5) return { text: "#9A3412", bg: "#FFF7ED", bar: "#F97316" }
    return { text: "#991B1B", bg: "#FEF2F2", bar: "#EF4444" }
}

// Trim Frappe-style doctype ids like "JOB-Software-Engineer-20260424" into a
// human label. Falls back to the raw value if it doesn't look like an id.
function humanizeJobPosting(raw?: string | null): string {
    if (!raw) return ""
    if (!/^[A-Z]+-/.test(raw)) return raw
    const parts = raw.split("-")
    // Drop leading prefix (e.g. "JOB") and trailing date-like chunks.
    return parts
        .slice(1)
        .filter((p) => !/^\d{6,}$/.test(p))
        .join(" ")
        .trim() || raw
}

// â”€â”€â”€ Bits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
}: {
    label: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    accent: "brand" | "emerald" | "amber" | "gray"
}) {
    const tone =
        accent === "brand"
            ? { fg: "#034078", bg: "#EFF6FF" }
            : accent === "emerald"
                ? { fg: "#166534", bg: "#DCFCE7" }
                : accent === "amber"
                    ? { fg: "#9A3412", bg: "#FFF7ED" }
                    : { fg: "#525252", bg: "#F5F5F5" }
    return (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
                <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: tone.bg, color: tone.fg }}
                >
                    <Icon className="h-3.5 w-3.5" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#0A1128]">{value}</p>
        </div>
    )
}


// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SortKey = "recent" | "selection" | "size" | "name"

export default function ReportsPage() {
    const router = useRouter()
    const [reports, setReports] = useState<ShortlistReport[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [sort, setSort] = useState<SortKey>("recent")

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadReports()
    }, [router])

    const loadReports = async () => {
        try {
            setLoading(true)
            const result = await apiClient.getShortlistReports()
            setReports(result.data || [])
        } catch (error) {
            console.error("Failed to load reports:", error)
        } finally {
            setLoading(false)
        }
    }

    const stats = useMemo(() => {
        const totalApplications = reports.reduce((sum, r) => sum + (r.total_applications || 0), 0)
        const totalShortlisted = reports.reduce((sum, r) => sum + (r.shortlisted_count || 0), 0)
        const overallRate = selectionRate(totalShortlisted, totalApplications)
        return {
            count: reports.length,
            applications: totalApplications,
            shortlisted: totalShortlisted,
            rate: overallRate == null ? "—" : `${overallRate.toFixed(0)}%`,
        }
    }, [reports])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = q
            ? reports.filter(
                (r) =>
                    (r.report_name || "").toLowerCase().includes(q) ||
                    (r.job_posting || "").toLowerCase().includes(q) ||
                    (r.report_summary || "").toLowerCase().includes(q)
            )
            : reports
        const sorted = [...list]
        switch (sort) {
            case "selection":
                sorted.sort((a, b) => {
                    const ra = selectionRate(a.shortlisted_count || 0, a.total_applications || 0) ?? -1
                    const rb = selectionRate(b.shortlisted_count || 0, b.total_applications || 0) ?? -1
                    return rb - ra
                })
                break
            case "size":
                sorted.sort((a, b) => (b.shortlisted_count || 0) - (a.shortlisted_count || 0))
                break
            case "name":
                sorted.sort((a, b) => (a.report_name || "").localeCompare(b.report_name || ""))
                break
            default:
                sorted.sort((a, b) => {
                    const at = new Date(a.generated_at || 0).getTime()
                    const bt = new Date(b.generated_at || 0).getTime()
                    return bt - at
                })
        }
        return sorted
    }, [reports, search, sort])

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Recruitment</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Shortlist Reports</h1>
                        <p className="mt-1 text-sm text-[#525252]">
                            AI-generated shortlists from your job postings — review, share, and export.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Reports" value={stats.count} icon={FileText} accent="gray" />
                    <StatCard label="Applications evaluated" value={stats.applications} icon={Users} accent="brand" />
                    <StatCard label="Candidates shortlisted" value={stats.shortlisted} icon={CheckCircle2} accent="emerald" />
                    <StatCard label="Avg selection rate" value={stats.rate} icon={TrendingUp} accent="amber" />
                </div>

                {/* Toolbar */}
                {reports.length > 0 && (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative max-w-sm flex-1 lg:flex-initial lg:w-80">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search reports, jobs, or summaries…"
                                className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden text-xs font-medium text-[#A3A3A3] sm:inline-flex sm:items-center sm:gap-1">
                                <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {([
                                    { key: "recent", label: "Most recent" },
                                    { key: "selection", label: "Selection rate" },
                                    { key: "size", label: "Most shortlisted" },
                                    { key: "name", label: "Name" },
                                ] as { key: SortKey; label: string }[]).map((opt) => {
                                    const active = sort === opt.key
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setSort(opt.key)}
                                            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                                            style={
                                                active
                                                    ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                                                    : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                                            }
                                        >
                                            {opt.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty / list */}
                {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#034078]">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="mt-1 text-base font-semibold text-[#0A1128]">No shortlist reports yet</p>
                        <p className="max-w-sm text-sm text-[#525252]">
                            Open a job posting and run the AI shortlisting to create your first report. It captures the AI&apos;s
                            ranked candidates, scores, and reasoning in one place.
                        </p>
                        <Button asChild className="mt-3 bg-[#034078] hover:bg-[#0A1128] text-white">
                            <Link href="/recruitment/hr/jobs" className="inline-flex items-center gap-1.5">
                                Go to job postings
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                        <PieChart className="h-8 w-8 text-[#A3A3A3]" />
                        <p className="text-sm font-semibold text-[#0A1128]">No reports match your search</p>
                        <p className="text-sm text-[#A3A3A3]">Try a different keyword or clear the search.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                        <div className="hidden grid-cols-[2.4fr_120px_120px_140px_140px_140px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
                            <div>Job</div>
                            <div>Applied</div>
                            <div>Shortlisted</div>
                            <div>Selection rate</div>
                            <div>Generated</div>
                            <div className="text-right">
                                <span className="sr-only">Actions</span>
                            </div>
                        </div>
                        <ul className="divide-y divide-[#F0F0F0]">
                            {filtered.map((report) => {
                                const total = report.total_applications || 0
                                const shortlisted = report.shortlisted_count || 0
                                const rate = selectionRate(shortlisted, total)
                                const jobLabel = humanizeJobPosting(report.job_posting) || "—"
                                return (
                                    <li
                                        key={report.name}
                                        className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[2.4fr_120px_120px_140px_140px_140px] lg:items-center lg:gap-4"
                                    >
                                        <div className="min-w-0">
                                            <Link
                                                href={`/recruitment/reports/${report.name}`}
                                                className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                                            >
                                                {jobLabel}
                                            </Link>
                                        </div>
                                        <div className="text-sm text-[#525252] tabular-nums">{total}</div>
                                        <div className="text-sm font-semibold text-[#0A1128] tabular-nums">
                                            {shortlisted}
                                        </div>
                                        <div className="text-sm tabular-nums">
                                            {rate == null ? (
                                                <span className="text-[#A3A3A3]">—</span>
                                            ) : (
                                                <span className="text-[#525252]">{rate.toFixed(0)}%</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-[#525252]">
                                            {report.generated_at ? formatDateRelative(report.generated_at) : "—"}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-medium lg:justify-end">
                                            <ConfirmDelete
                                                trigger={
                                                    <button
                                                        type="button"
                                                        className="font-semibold text-red-600 hover:text-red-700"
                                                    >
                                                        Delete
                                                        <span className="sr-only">, {jobLabel}</span>
                                                    </button>
                                                }
                                                title="Delete Report"
                                                description="Are you sure you want to delete this report? This action cannot be undone."
                                                onConfirm={async () =>
                                                    await apiClient.deleteShortlistReport(report.name)
                                                }
                                                onAfterDelete={loadReports}
                                            />
                                            <Link
                                                href={`/recruitment/reports/${report.name}`}
                                                className="font-semibold text-[#034078] hover:text-[#0A1128]"
                                            >
                                                Open
                                                <span className="sr-only">, {jobLabel}</span>
                                            </Link>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
