"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import type { Feedback } from "@/lib/recruitment/types"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Eye,
    MessageSquare,
    RefreshCw,
    Send,
    Trash2,
    XCircle,
} from "lucide-react"

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FeedbackStatus = "New" | "Reviewed" | "Resolved" | "Dismissed"

const STATUS_TONES: Record<FeedbackStatus, { dot: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
    New: { dot: "#1282A2", bg: "#EFF6FF", text: "#034078", border: "#BFDBFE", icon: MessageSquare },
    Reviewed: { dot: "#F97316", bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA", icon: Eye },
    Resolved: { dot: "#28C76F", bg: "#DCFCE7", text: "#166534", border: "#BBF7D0", icon: CheckCircle2 },
    Dismissed: { dot: "#A3A3A3", bg: "#F5F5F5", text: "#525252", border: "#E5E5E5", icon: XCircle },
}

function formatRelative(date?: string | null): string {
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

function formatAbsolute(date?: string | null): string {
    if (!date) return ""
    const d = new Date(date.replace(" ", "T"))
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function StatusPill({ status }: { status?: string | null }) {
    const key = (status as FeedbackStatus) in STATUS_TONES ? (status as FeedbackStatus) : "New"
    const tone = STATUS_TONES[key]
    const Icon = tone.icon
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
        >
            <Icon className="h-3 w-3" />
            {key}
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

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function FeedbackPage() {
    const router = useRouter()
    const [comment, setComment] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [filter, setFilter] = useState<FeedbackStatus | "all">("all")

    const loadFeedback = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiClient.getMyFeedback(0, 50)
            setFeedbacks(res.data || [])
        } catch (err) {
            console.error("Failed to load feedback:", err)
            setError("Failed to load feedback")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadFeedback()
    }, [router])

    const submit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSuccess(null)
        setError(null)

        if (!comment || !comment.trim()) {
            setError("Please enter your feedback before submitting.")
            return
        }

        setSubmitting(true)
        try {
            const res: any = await apiClient.submitFeedback(comment.trim())
            if (res?.success) {
                setSuccess(res.message || "Thanks — your feedback was submitted.")
                setComment("")
                if (res.data) {
                    setFeedbacks((prev) => [res.data as Feedback, ...prev])
                } else {
                    await loadFeedback()
                }
            } else {
                setError(res?.message || "Failed to submit feedback.")
            }
        } catch (err: any) {
            console.error("Submit feedback failed", err)
            setError(err?.message || String(err))
        } finally {
            setSubmitting(false)
        }
    }

    const counts = useMemo(() => {
        const map: Record<FeedbackStatus, number> = {
            New: 0,
            Reviewed: 0,
            Resolved: 0,
            Dismissed: 0,
        }
        for (const f of feedbacks) {
            const key = (f.status as FeedbackStatus) in map ? (f.status as FeedbackStatus) : "New"
            map[key]++
        }
        return { all: feedbacks.length, ...map }
    }, [feedbacks])

    const filtered = useMemo(() => {
        const list = filter === "all" ? feedbacks : feedbacks.filter((f) => (f.status || "New") === filter)
        return [...list].sort((a, b) => {
            const at = new Date(a.submitted_at || 0).getTime()
            const bt = new Date(b.submitted_at || 0).getTime()
            return bt - at
        })
    }, [feedbacks, filter])

    const remainingChars = 2000 - comment.length

    return (
        <MainLayout>
            <div className="mx-auto max-w-5xl space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Account</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Feedback</h1>
                        <p className="mt-1 text-sm text-[#525252]">
                            Share suggestions, report issues, or tell us what to build next. Every entry lands on the team&apos;s queue.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadFeedback}
                        className="inline-flex items-center gap-1.5 border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatChip label="Total" value={counts.all} icon={MessageSquare} tone="gray" />
                    <StatChip label="In review" value={counts.New + counts.Reviewed} icon={Clock} tone="amber" />
                    <StatChip label="Resolved" value={counts.Resolved} icon={CheckCircle2} tone="emerald" />
                    <StatChip label="Dismissed" value={counts.Dismissed} icon={XCircle} tone="gray" />
                </div>

                {/* Compose */}
                <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                    <header className="flex items-start gap-3 border-b border-[#E5E5E5] px-6 py-4">
                        <div className="flex-1">
                            <h2 className="text-base font-semibold text-[#0A1128]">Send new feedback</h2>
                            <p className="text-xs text-[#525252]">
                                What did you like, dislike, or wish worked differently? Be as specific as you can.
                            </p>
                        </div>
                    </header>
                    <form onSubmit={submit} className="space-y-3 p-6">
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                            placeholder="e.g. The candidate-application page took ~12s to load when filtering by 'Shortlisted'. Could we paginate the list instead?"
                            className="min-h-[140px] resize-y border-[#E5E5E5] focus:border-[#034078] focus:ring-[#034078]/20"
                        />
                        <div className="flex items-center justify-between text-xs">
                            <p className={remainingChars < 100 ? "text-amber-600" : "text-[#A3A3A3]"}>
                                {remainingChars} characters left
                            </p>
                            {comment && (
                                <button
                                    type="button"
                                    onClick={() => setComment("")}
                                    className="inline-flex items-center gap-1 text-[#A3A3A3] hover:text-[#525252]"
                                >
                                    <Trash2 className="h-3 w-3" /> Clear
                                </button>
                            )}
                        </div>

                        {success && (
                            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{success}</span>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex justify-end pt-1">
                            <Button
                                type="submit"
                                disabled={submitting || !comment.trim()}
                                className="bg-[#034078] hover:bg-[#0A1128] text-white"
                            >
                                {submitting ? (
                                    "Submitting…"
                                ) : (
                                    <>
                                        <Send className="mr-1.5 h-3.5 w-3.5" />
                                        Submit feedback
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </section>

                {/* History */}
                <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-[#0A1128]">
                            My feedback
                            <span className="ml-2 text-sm font-normal text-[#A3A3A3]">
                                {filtered.length} of {feedbacks.length}
                            </span>
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                            {(["all", "New", "Reviewed", "Resolved", "Dismissed"] as const).map((key) => {
                                const active = filter === key
                                const count = key === "all" ? counts.all : counts[key]
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setFilter(key)}
                                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                                        style={
                                            active
                                                ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                                                : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                                        }
                                    >
                                        {key === "all" ? "All" : key}
                                        <span
                                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                            style={
                                                active
                                                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                                                    : { background: "#F5F5F5", color: "#525252" }
                                            }
                                        >
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#034078]">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <p className="mt-1 text-sm font-semibold text-[#0A1128]">
                                {feedbacks.length === 0 ? "No feedback yet" : "Nothing matches this filter"}
                            </p>
                            <p className="max-w-sm text-xs text-[#A3A3A3]">
                                {feedbacks.length === 0
                                    ? "Once you send feedback, it shows up here with the team's response status."
                                    : "Try a different filter."}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {filtered.map((f) => (
                                <li
                                    key={f.name}
                                    className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden"
                                >
                                    <div className="flex items-start gap-4 px-5 py-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#171717]">
                                                {f.comment}
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A3A3A3]">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatRelative(f.submitted_at)}
                                                </span>
                                                {f.submitted_at && (
                                                    <span className="hidden sm:inline">{formatAbsolute(f.submitted_at)}</span>
                                                )}
                                            </div>
                                            {f.admin_notes && (
                                                <div className="mt-3 rounded-lg border-l-2 border-[#034078] bg-[#EFF6FF]/50 px-3 py-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#034078]">
                                                        Team note
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#171717]">
                                                        {f.admin_notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <StatusPill status={f.status} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </MainLayout>
    )
}
