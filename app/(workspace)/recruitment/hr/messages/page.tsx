"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"
import {
    Briefcase,
    Check,
    Inbox,
    Mail,
    MailOpen,
    MessageSquarePlus,
    RefreshCw,
    Search,
    Send,
} from "lucide-react"
import type { CandidateMessage } from "@/lib/recruitment/types"

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getInitials(input?: string | null): string {
    if (!input) return "?"
    // For email-style strings, use the part before @.
    const stem = input.includes("@") ? input.split("@")[0] : input
    const parts = stem.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRelative(date?: string | null): string {
    if (!date) return ""
    const d = new Date(date.replace(" ", "T"))
    if (Number.isNaN(d.getTime())) return ""
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

function StatChip({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string
    value: number | string
    icon: React.ComponentType<{ className?: string }>
    tone: "brand" | "amber" | "gray"
}) {
    const palette =
        tone === "brand"
            ? { fg: "#034078", bg: "#EFF6FF" }
            : tone === "amber"
                ? { fg: "#9A3412", bg: "#FFF7ED" }
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

export default function HrMessagesPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [composeOpen, setComposeOpen] = useState(false)
    const [messages, setMessages] = useState<CandidateMessage[]>([])
    const [filter, setFilter] = useState<"all" | "unread">("all")
    const [search, setSearch] = useState("")
    const [form, setForm] = useState({ recipient: "", message: "", job_posting: "" })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }
        loadMessages()
    }, [router])

    const loadMessages = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const response = await apiClient.getCandidateMessages(userEmail)
            setMessages(response.messages || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load messages")
        } finally {
            setLoading(false)
        }
    }

    const handleSendMessage = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please log in again.")
            return
        }
        if (!form.recipient.trim() || !form.message.trim()) {
            toast.error("Recipient and message are required.")
            return
        }
        setSending(true)
        try {
            await apiClient.sendCandidateMessage(
                userEmail,
                form.recipient.trim(),
                form.message.trim(),
                form.job_posting.trim() || undefined
            )
            toast.success("Message sent")
            setForm({ recipient: "", message: "", job_posting: "" })
            setComposeOpen(false)
            loadMessages()
        } catch (error: any) {
            toast.error(error.message || "Failed to send message")
        } finally {
            setSending(false)
        }
    }

    const handleMarkRead = async (messageId: string) => {
        try {
            await apiClient.markCandidateMessageRead(messageId)
            setMessages((prev) =>
                prev.map((m) => (m.name === messageId ? { ...m, is_read: 1 } : m))
            )
        } catch (error: any) {
            toast.error(error.message || "Failed to mark as read")
        }
    }

    const counts = useMemo(() => {
        const unread = messages.filter((m) => !m.is_read).length
        return { all: messages.length, unread }
    }, [messages])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = messages.filter((m) => {
            if (filter === "unread" && m.is_read) return false
            if (q) {
                const hay = `${m.sender || ""} ${m.message || ""} ${m.job_posting || ""}`.toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
        return [...list].sort((a, b) => {
            const at = new Date(a.creation || 0).getTime()
            const bt = new Date(b.creation || 0).getTime()
            return bt - at
        })
    }, [messages, filter, search])

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
            <div className="mx-auto max-w-5xl space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">HR Workspace</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Messages</h1>
                        <p className="mt-1 text-sm text-[#525252]">
                            Direct line to candidates — schedule, follow up, or share an offer.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={loadMessages}
                            className="border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setComposeOpen((v) => !v)}
                            className="bg-[#034078] hover:bg-[#0A1128] text-white"
                        >
                            <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                            {composeOpen ? "Hide compose" : "New message"}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <StatChip label="Total" value={counts.all} icon={Inbox} tone="gray" />
                    <StatChip label="Unread" value={counts.unread} icon={Mail} tone="amber" />
                    <StatChip label="Read" value={counts.all - counts.unread} icon={MailOpen} tone="brand" />
                </div>

                {/* Compose */}
                {composeOpen && (
                    <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
                        <header className="border-b border-[#E5E5E5] px-6 py-4">
                            <h2 className="text-base font-semibold text-[#0A1128]">Compose new message</h2>
                            <p className="text-xs text-[#525252]">
                                The candidate gets it in their candidate inbox immediately.
                            </p>
                        </header>
                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="recipient" className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Candidate email
                                </Label>
                                <Input
                                    id="recipient"
                                    type="email"
                                    value={form.recipient}
                                    onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
                                    placeholder="candidate@example.com"
                                    className="border-[#E5E5E5] focus:border-[#034078]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="job_posting" className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Job posting (optional)
                                </Label>
                                <Input
                                    id="job_posting"
                                    value={form.job_posting}
                                    onChange={(e) => setForm((p) => ({ ...p, job_posting: e.target.value }))}
                                    placeholder="JOB-…"
                                    className="border-[#E5E5E5] focus:border-[#034078]"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="message" className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                    Message
                                </Label>
                                <Textarea
                                    id="message"
                                    value={form.message}
                                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                                    placeholder="Hi — thanks for applying. Are you available for a 15-minute call this week?"
                                    className="min-h-[140px] resize-y border-[#E5E5E5] focus:border-[#034078]"
                                />
                            </div>
                            <div className="flex justify-end gap-2 sm:col-span-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setComposeOpen(false)
                                        setForm({ recipient: "", message: "", job_posting: "" })
                                    }}
                                    className="border-[#E5E5E5] text-[#525252] hover:bg-[#F5F5F5]"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={sending || !form.recipient.trim() || !form.message.trim()}
                                    className="bg-[#034078] hover:bg-[#0A1128] text-white"
                                >
                                    {sending ? (
                                        "Sending…"
                                    ) : (
                                        <>
                                            <Send className="mr-1.5 h-3.5 w-3.5" />
                                            Send message
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Inbox toolbar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                        {(["all", "unread"] as const).map((key) => {
                            const active = filter === key
                            const count = key === "all" ? counts.all : counts.unread
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFilter(key)}
                                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
                                    style={
                                        active
                                            ? { background: "#034078", color: "#fff", borderColor: "#034078" }
                                            : { background: "#fff", color: "#525252", borderColor: "#E5E5E5" }
                                    }
                                >
                                    {key === "all" ? "All" : "Unread"}
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
                    <div className="relative max-w-sm flex-1 lg:flex-initial lg:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search sender, message, or job…"
                            className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
                        />
                    </div>
                </div>

                {/* Inbox */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#034078]">
                            <Inbox className="h-5 w-5" />
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#0A1128]">
                            {messages.length === 0
                                ? "Your inbox is empty"
                                : filter === "unread"
                                    ? "No unread messages"
                                    : "Nothing matches your search"}
                        </p>
                        <p className="max-w-sm text-xs text-[#A3A3A3]">
                            {messages.length === 0
                                ? "Send the first message to a candidate to start a conversation."
                                : "Try a different filter or clear your search."}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {filtered.map((m) => {
                            const unread = !m.is_read
                            return (
                                <li
                                    key={m.name}
                                    className="rounded-2xl border bg-white shadow-sm overflow-hidden"
                                    style={{
                                        borderColor: unread ? "#BFDBFE" : "#E5E5E5",
                                        boxShadow: unread ? "0 0 0 4px rgba(3, 64, 120, 0.04)" : undefined,
                                    }}
                                >
                                    <div className="flex items-start gap-4 px-5 py-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                <p className="truncate text-sm font-semibold text-[#0A1128]">
                                                    {m.sender || "Unknown sender"}
                                                    {unread && (
                                                        <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#1282A2] align-middle" aria-hidden="true" />
                                                    )}
                                                </p>
                                                <span className="text-xs text-[#A3A3A3]">{formatRelative(m.creation)}</span>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#171717]">
                                                {m.message}
                                            </p>
                                        </div>
                                        {unread && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleMarkRead(m.name)}
                                                className="border-[#E5E5E5] text-[#034078] hover:bg-[#EFF6FF]"
                                            >
                                                <Check className="mr-1 h-3.5 w-3.5" />
                                                Mark read
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </MainLayout>
    )
}
