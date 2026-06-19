"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { apiClient } from "@/lib/recruitment/api-client"
import { getStoredUserEmail } from "@/lib/recruitment/role-routing"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import {
    AlertCircle,
    Briefcase,
    CheckCheck,
    MessageSquare,
    RefreshCw,
    Send,
} from "lucide-react"
import type { CandidateMessage, JobPosting } from "@/lib/recruitment/types"

type ThreadSummary = {
    key: string
    participant: string
    messages: CandidateMessage[]
    unreadIncomingCount: number
    lastTimestamp: number
}

type ComposeError = {
    field: "jobPosting" | "message" | "general"
    message: string
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

const getMessageTimestamp = (message: CandidateMessage) => {
    const created = message.creation ? new Date(message.creation).getTime() : NaN
    return Number.isFinite(created) ? created : 0
}

const formatMessageTime = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    if (sameDay) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

const formatFullDateTime = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const initialsFromEmail = (email: string) => {
    const clean = email.split("@")[0] || email
    const tokens = clean.split(/[._-]/).filter(Boolean)
    if (tokens.length >= 2) {
        return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase()
    }
    return (clean.slice(0, 2) || "?").toUpperCase()
}

const toFriendlySendError = (error: unknown): ComposeError => {
    const raw = error instanceof Error ? error.message : String(error || "")
    const normalized = raw.toLowerCase()

    if (
        normalized.includes("job_posting is required") ||
        normalized.includes("invalid job_posting") ||
        normalized.includes("could not resolve recipient from selected job posting")
    ) {
        return {
            field: "jobPosting",
            message: "Select a valid job posting and try again.",
        }
    }

    if (
        normalized.includes("permission") ||
        normalized.includes("not permitted") ||
        normalized.includes("403")
    ) {
        return {
            field: "general",
            message: "You don't have permission to send this message right now. Please refresh and try again.",
        }
    }

    return {
        field: "general",
        message: "Message couldn't be sent right now. Please try again in a moment.",
    }
}

export default function CandidateMessagesPage() {
    const router = useRouter()
    const userEmail = useMemo(() => getStoredUserEmail(), [])
    const normalizedUserEmail = useMemo(() => normalizeEmail(userEmail), [userEmail])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [messages, setMessages] = useState<CandidateMessage[]>([])
    const [jobOptions, setJobOptions] = useState<JobPosting[]>([])
    const [selectedThreadKey, setSelectedThreadKey] = useState("")
    const [composeError, setComposeError] = useState<ComposeError | null>(null)
    const [form, setForm] = useState({ message: "", job_posting: "" })

    useEffect(() => {
        if (!apiClient.isAuthenticated()) {
            router.push("/login")
            return
        }

        void loadInitialData()
    }, [router])

    const loadInitialData = async () => {
        await Promise.all([loadMessages(), loadJobPostings()])
    }

    const loadMessages = async () => {
        if (!userEmail) {
            setLoading(false)
            return
        }

        try {
            const response = await apiClient.getCandidateMessages(userEmail)
            setMessages(response.messages || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load messages")
        } finally {
            setLoading(false)
        }
    }

    const loadJobPostings = async () => {
        try {
            const response = await apiClient.candidateGetJobPostings(0, 200)
            setJobOptions(response.data || [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load job postings")
        }
    }

    const jobTitleById = useMemo(() => {
        const map = new Map<string, string>()
        for (const job of jobOptions) {
            map.set(job.name, job.job_title || "Untitled job")
        }
        return map
    }, [jobOptions])

    const threads = useMemo<ThreadSummary[]>(() => {
        const byThread = new Map<string, CandidateMessage[]>()

        for (const message of messages) {
            const sender = normalizeEmail(message.sender)
            const recipient = normalizeEmail(message.recipient)
            const counterpart = sender === normalizedUserEmail ? recipient : sender
            if (!counterpart) continue

            const existing = byThread.get(counterpart) || []
            existing.push(message)
            byThread.set(counterpart, existing)
        }

        const summaries: ThreadSummary[] = []
        for (const [key, threadMessages] of byThread.entries()) {
            const sorted = [...threadMessages].sort(
                (a, b) => getMessageTimestamp(a) - getMessageTimestamp(b),
            )
            const unreadIncomingCount = sorted.filter(
                (m) => normalizeEmail(m.sender) !== normalizedUserEmail && !m.is_read,
            ).length
            const lastTimestamp = getMessageTimestamp(sorted[sorted.length - 1])

            const participant =
                sorted
                    .map((m) =>
                        normalizeEmail(m.sender) === normalizedUserEmail
                            ? m.recipient || ""
                            : m.sender || "",
                    )
                    .find((value) => value.trim().length > 0)
                    ?.trim() || key

            summaries.push({ key, participant, messages: sorted, unreadIncomingCount, lastTimestamp })
        }

        return summaries.sort((a, b) => b.lastTimestamp - a.lastTimestamp)
    }, [messages, normalizedUserEmail])

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.key === selectedThreadKey) || null,
        [threads, selectedThreadKey],
    )

    useEffect(() => {
        if (!threads.length) {
            setSelectedThreadKey("")
            return
        }
        const stillExists = threads.some((thread) => thread.key === selectedThreadKey)
        if (!stillExists) setSelectedThreadKey(threads[0].key)
    }, [threads, selectedThreadKey])

    const handleSendMessage = async () => {
        if (!userEmail) {
            toast.error("User email not found. Please login again.")
            return
        }

        if (!form.job_posting.trim() || !form.message.trim()) {
            const next: ComposeError = !form.job_posting.trim()
                ? { field: "jobPosting", message: "Select a job posting." }
                : { field: "message", message: "Message cannot be empty." }
            setComposeError(next)
            toast.error(next.message)
            return
        }

        setComposeError(null)
        setSending(true)
        try {
            await apiClient.sendCandidateMessage(
                userEmail,
                "",
                form.message.trim(),
                form.job_posting.trim(),
            )
            toast.success("Message sent")
            setForm((prev) => ({ ...prev, message: "" }))
            await loadMessages()

            const sentTo = normalizeEmail(
                selectedThread?.participant ||
                messages.find((m) => m.job_posting === form.job_posting)?.sender ||
                "",
            )
            if (sentTo) setSelectedThreadKey(sentTo)
        } catch (error: any) {
            const friendly = toFriendlySendError(error)
            setComposeError(friendly)
            toast.error(friendly.message)
        } finally {
            setSending(false)
        }
    }

    const handleMarkThreadRead = async () => {
        if (!selectedThread) return

        const incomingUnread = selectedThread.messages
            .filter((m) => normalizeEmail(m.sender) !== normalizedUserEmail && !m.is_read)
            .map((m) => m.name)

        if (incomingUnread.length === 0) return

        try {
            await Promise.all(incomingUnread.map((id) => apiClient.markCandidateMessageRead(id)))
            setMessages((prev) =>
                prev.map((msg) => (incomingUnread.includes(msg.name) ? { ...msg, is_read: 1 } : msg)),
            )
            toast.success("Conversation marked as read")
        } catch (error: any) {
            toast.error(error.message || "Failed to mark conversation as read")
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

    const totalUnread = threads.reduce((acc, t) => acc + t.unreadIncomingCount, 0)

    return (
        <MainLayout>
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
                            Inbox
                        </p>
                        <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
                            Messages
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#525252]">
                            Chat with recruiters about specific roles. {totalUnread > 0 && (
                                <span className="font-semibold text-[#034078]">
                                    {totalUnread} unread
                                </span>
                            )}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={loadInitialData}
                        className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
                    {/* Threads list */}
                    <div className="rounded-2xl border border-[#E5E5E5] bg-white">
                        <div className="border-b border-[#E5E5E5] px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Conversations
                            </p>
                            <p className="text-sm font-semibold text-[#0A1128]">
                                {threads.length} {threads.length === 1 ? "thread" : "threads"}
                            </p>
                        </div>
                        <div className="p-2">
                            {threads.length === 0 ? (
                                <div className="px-3 py-10 text-center">
                                    <span
                                        className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-[#A3A3A3]"
                                        style={{ background: "#F5F5F5" }}
                                        aria-hidden="true"
                                    >
                                        <MessageSquare className="h-5 w-5" />
                                    </span>
                                    <p className="text-sm font-semibold text-[#0A1128]">No conversations</p>
                                    <p className="mt-1 text-xs text-[#525252]">
                                        Start one from the compose box.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
                                    {threads.map((thread) => {
                                        const last = thread.messages[thread.messages.length - 1]
                                        const active = selectedThreadKey === thread.key
                                        return (
                                            <button
                                                key={thread.key}
                                                type="button"
                                                onClick={() => setSelectedThreadKey(thread.key)}
                                                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                                    active
                                                        ? "border-[#034078]/30 bg-[#EFF6FF]"
                                                        : "border-transparent hover:bg-[#F9FAFB]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="truncate text-sm font-semibold text-[#0A1128]">
                                                                {thread.participant}
                                                            </p>
                                                            <span className="whitespace-nowrap text-[11px] text-[#A3A3A3]">
                                                                {formatMessageTime(last?.creation)}
                                                            </span>
                                                        </div>
                                                        <p className="line-clamp-2 text-xs text-[#525252]">
                                                            {last?.message || ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                {thread.unreadIncomingCount > 0 && (
                                                    <span className="mt-2 inline-flex items-center rounded-full bg-[#034078] px-2 py-0.5 text-[10px] font-semibold text-white">
                                                        {thread.unreadIncomingCount} new
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Thread + Compose */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-[#E5E5E5] bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] px-5 py-4">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                        Thread
                                    </p>
                                    <p className="truncate text-base font-semibold text-[#0A1128]">
                                        {selectedThread?.participant || "Pick a conversation"}
                                    </p>
                                </div>
                                {selectedThread && selectedThread.unreadIncomingCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleMarkThreadRead}
                                        className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                                    >
                                        <CheckCheck className="mr-2 h-4 w-4" />
                                        Mark read
                                    </Button>
                                )}
                            </div>
                            <div className="p-4">
                                {!selectedThread ? (
                                    <div className="flex h-[360px] items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] bg-[#F9FAFB] text-sm text-[#525252]">
                                        No conversation selected.
                                    </div>
                                ) : (
                                    <div className="h-[420px] space-y-3 overflow-y-auto pr-1">
                                        {selectedThread.messages.map((message) => {
                                            const isMine =
                                                normalizeEmail(message.sender) === normalizedUserEmail
                                            return (
                                                <div
                                                    key={message.name}
                                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                            isMine
                                                                ? "bg-[#034078] text-white"
                                                                : "border border-[#E5E5E5] bg-[#F9FAFB] text-[#171717]"
                                                        }`}
                                                    >
                                                        <p className="whitespace-pre-wrap break-words">
                                                            {message.message}
                                                        </p>
                                                        <div
                                                            className={`mt-2 flex items-center justify-between gap-3 text-[11px] ${
                                                                isMine ? "text-white/80" : "text-[#A3A3A3]"
                                                            }`}
                                                        >
                                                            <span>{formatFullDateTime(message.creation)}</span>
                                                            {!isMine && !message.is_read && (
                                                                <span className="font-semibold text-[#034078]">
                                                                    Unread
                                                                </span>
                                                            )}
                                                        </div>
                                                        {message.job_posting && (
                                                            <p
                                                                className={`mt-2 inline-flex items-center gap-1 text-[11px] ${
                                                                    isMine ? "text-white/85" : "text-[#525252]"
                                                                }`}
                                                            >
                                                                <Briefcase className="h-3 w-3" />
                                                                {jobTitleById.get(message.job_posting) ||
                                                                    "Selected job"}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compose */}
                        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                Compose
                            </p>
                            <p className="mt-0.5 text-base font-semibold text-[#0A1128]">
                                Send a message
                            </p>

                            <div className="mt-4 space-y-3">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="job_posting"
                                        className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                                    >
                                        Job posting
                                    </Label>
                                    <Select
                                        value={form.job_posting}
                                        onValueChange={(value) => {
                                            setComposeError((prev) =>
                                                prev?.field === "jobPosting" ? null : prev,
                                            )
                                            setForm((prev) => ({ ...prev, job_posting: value }))
                                        }}
                                    >
                                        <SelectTrigger
                                            id="job_posting"
                                            className={`border-[#E5E5E5] ${
                                                composeError?.field === "jobPosting" ? "border-red-400" : ""
                                            }`}
                                        >
                                            <SelectValue placeholder="Select a job" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobOptions.length === 0 ? (
                                                <SelectItem value="__no_jobs__" disabled>
                                                    No job postings available
                                                </SelectItem>
                                            ) : (
                                                jobOptions.map((job) => (
                                                    <SelectItem key={job.name} value={job.name}>
                                                        {job.job_title || "Untitled job"}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {composeError?.field === "jobPosting" && (
                                        <p className="flex items-center gap-1 text-xs text-red-600">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {composeError.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="message"
                                        className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]"
                                    >
                                        Message
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={form.message}
                                        onChange={(e) => {
                                            setComposeError((prev) =>
                                                prev?.field === "message" ? null : prev,
                                            )
                                            setForm((prev) => ({ ...prev, message: e.target.value }))
                                        }}
                                        placeholder="Type your message…"
                                        className={`min-h-[110px] border-[#E5E5E5] focus:border-[#034078] ${
                                            composeError?.field === "message" ? "border-red-400" : ""
                                        }`}
                                    />
                                    {composeError?.field === "message" && (
                                        <p className="flex items-center gap-1 text-xs text-red-600">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {composeError.message}
                                        </p>
                                    )}
                                </div>

                                {composeError?.field === "general" && (
                                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                        <p>{composeError.message}</p>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSendMessage}
                                    disabled={sending}
                                    className="bg-[#034078] text-white hover:bg-[#0A1128]"
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {sending ? "Sending…" : "Send message"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
