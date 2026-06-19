"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient, type BillingAnalytics, type BillingRange } from "@/lib/recruitment/api-client"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    FileText,
    LineChart,
    TrendingUp,
    Video,
} from "lucide-react"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOB_PALETTE = ["#034078", "#1282A2", "#28C76F", "#F97316", "#7C3AED", "#06B6D4", "#EF4444", "#F59E0B"]

function formatNumber(n?: number | null) {
    if (n == null || Number.isNaN(n)) return "—"
    return n.toLocaleString()
}

function formatDateLabel(value: string) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatPeriod(start?: string | null, end?: string | null) {
    if (!start || !end) return ""
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${start} → ${end}`
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} → ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatChip({
    label,
    value,
    sub,
    icon: Icon,
    tone,
}: {
    label: string
    value: string
    sub?: string
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
            {sub && <p className="mt-1 text-xs text-[#A3A3A3]">{sub}</p>}
        </div>
    )
}

function ChartCard({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <section className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
            <header className="border-b border-[#E5E5E5] px-5 py-3">
                <h3 className="text-sm font-semibold text-[#0A1128]">{title}</h3>
                {subtitle && <p className="text-xs text-[#A3A3A3]">{subtitle}</p>}
            </header>
            <div className="p-5">{children}</div>
        </section>
    )
}

function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: Array<any>
    label?: string
}) {
    if (!active || !payload?.length) return null
    return (
        <div className="min-w-[180px] rounded-lg border border-[#E5E5E5] bg-white p-3 text-sm shadow-md">
            {label && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                    {formatDateLabel(label)}
                </p>
            )}
            <div className="space-y-1.5">
                {payload.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#525252]">
                            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                            {item.name}
                        </span>
                        <span className="font-semibold tabular-nums text-[#171717]">
                            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HrBillingAnalyticsPage() {
    const [range, setRange] = useState<BillingRange>("period")
    const [analytics, setAnalytics] = useState<BillingAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await apiClient.getBillingAnalytics(range)
                if (!cancelled) setAnalytics(data)
            } catch (err: any) {
                if (!cancelled) setError(err?.message || "Failed to load billing analytics.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [range])

    const totalsInterviews = analytics?.totals.interviews_used ?? 0
    const totalsCvs = analytics?.totals.cvs_used ?? 0
    const activeDays = analytics?.totals.active_days ?? 0
    const dailyUsage = analytics?.daily_usage ?? []
    const usageByJob = useMemo(
        () =>
            (analytics?.usage_by_job ?? []).map((job, idx) => ({
                ...job,
                color: JOB_PALETTE[idx % JOB_PALETTE.length],
            })),
        [analytics],
    )
    const totalCvsAcrossJobs = usageByJob.reduce((s, j) => s + j.cvs, 0)
    const avgCvsPerActiveDay = activeDays > 0 ? totalsCvs / activeDays : 0
    const periodLabel = analytics?.period ? formatPeriod(analytics.period.start, analytics.period.end) : ""
    const activity = analytics?.activity ?? []

    return (
        <MainLayout>
            <div className="mx-auto max-w-7xl space-y-6 pb-20">
                {/* Top bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link
                            href="/recruitment/hr/billing"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
                        >
                            <ArrowLeft className="h-4 w-4" /> Wallet &amp; billing
                        </Link>
                        <h1 className="mt-2 text-3xl font-bold text-[#0A1128]">Usage analytics</h1>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#525252]">
                            <Calendar className="h-3.5 w-3.5 text-[#A3A3A3]" />
                            {periodLabel || "Loading period…"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {([
                            { key: "7d" as BillingRange, label: "Last 7d" },
                            { key: "30d" as BillingRange, label: "Last 30d" },
                            { key: "period" as BillingRange, label: "This period" },
                            //{ key: "all" as BillingRange, label: "All time" },
                        ]).map((opt) => {
                            const active = range === opt.key
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setRange(opt.key)}
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

                {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
                    </div>
                ) : analytics ? (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatChip
                                label="Interviews used"
                                value={formatNumber(totalsInterviews)}
                                icon={Video}
                                tone="brand"
                            />
                            <StatChip
                                label="CV evaluations"
                                value={formatNumber(totalsCvs)}
                                icon={FileText}
                                tone="emerald"
                            />
                            <StatChip
                                label="Active days"
                                value={String(activeDays)}
                                sub={`out of ${dailyUsage.length} in window`}
                                icon={Calendar}
                                tone="amber"
                            />
                            <StatChip
                                label="Avg CVs / active day"
                                value={avgCvsPerActiveDay.toFixed(1)}
                                icon={TrendingUp}
                                tone="gray"
                            />
                        </div>

                        {/* Daily usage */}
                        <ChartCard
                            title="Daily usage"
                            subtitle={`${dailyUsage.length} days in selected window`}
                        >
                            {dailyUsage.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={dailyUsage} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="cvsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1282A2" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#1282A2" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="interviewsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#034078" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#034078" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatDateLabel}
                                            tick={{ fontSize: 11, fill: "#A3A3A3" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#A3A3A3" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} labelFormatter={(v) => formatDateLabel(String(v))} />
                                        <Legend
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="cvs"
                                            name="CV evaluations"
                                            stroke="#1282A2"
                                            fill="url(#cvsGradient)"
                                            strokeWidth={2}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="interviews"
                                            name="Interviews"
                                            stroke="#034078"
                                            fill="url(#interviewsGradient)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E5E5E5] py-10 text-center">
                                    <LineChart className="h-7 w-7 text-[#A3A3A3]" />
                                    <p className="text-sm font-semibold text-[#0A1128]">No usage in this window</p>
                                </div>
                            )}
                        </ChartCard>

                        {/* Usage by job */}
                        <div className="grid gap-5 xl:grid-cols-3">
                            <div className="xl:col-span-2">
                                <ChartCard
                                    title="Usage by job posting"
                                    subtitle="Interviews and CV evaluations spent per role"
                                >
                                    {usageByJob.length > 0 ? (
                                        <div className="overflow-hidden rounded-xl border border-[#E5E5E5]">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="px-6 py-4 text-sm font-semibold text-[#0A1128]">
                                                            Job posting
                                                        </TableHead>
                                                        <TableHead className="px-6 py-4 text-right text-sm font-semibold text-[#0A1128]">
                                                            Interviews
                                                        </TableHead>
                                                        <TableHead className="px-6 py-4 text-right text-sm font-semibold text-[#0A1128]">
                                                            CVs
                                                        </TableHead>
                                                        <TableHead className="px-6 py-4 text-right text-sm font-semibold text-[#0A1128]">
                                                            CV share
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {usageByJob.map((job) => {
                                                        const share =
                                                            totalCvsAcrossJobs > 0
                                                                ? (job.cvs / totalCvsAcrossJobs) * 100
                                                                : 0
                                                        return (
                                                            <TableRow key={job.id}>
                                                                <TableCell className="px-6 py-5 text-sm font-medium text-[#171717]">
                                                                    {job.title}
                                                                </TableCell>
                                                                <TableCell className="px-6 py-5 text-right text-sm tabular-nums text-[#525252]">
                                                                    {job.interviews}
                                                                </TableCell>
                                                                <TableCell className="px-6 py-5 text-right text-sm font-semibold tabular-nums text-[#0A1128]">
                                                                    {job.cvs}
                                                                </TableCell>
                                                                <TableCell className="px-6 py-5 text-right text-sm tabular-nums text-[#525252]">
                                                                    {share.toFixed(1)}%
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E5E5E5] py-10 text-center">
                                            <FileText className="h-7 w-7 text-[#A3A3A3]" />
                                            <p className="text-sm font-semibold text-[#0A1128]">
                                                No job-level usage yet
                                            </p>
                                        </div>
                                    )}
                                </ChartCard>
                            </div>

                            <ChartCard title="CV evaluations by job">
                                {usageByJob.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={Math.max(220, usageByJob.length * 36)}>
                                        <BarChart
                                            data={usageByJob}
                                            layout="vertical"
                                            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                                            <XAxis
                                                type="number"
                                                tick={{ fontSize: 11, fill: "#A3A3A3" }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="title"
                                                width={120}
                                                tick={{ fontSize: 11, fill: "#525252" }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="cvs" name="CVs" radius={[0, 4, 4, 0]}>
                                                {usageByJob.map((job) => (
                                                    <Cell key={job.id} fill={job.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="py-10 text-center text-sm text-[#A3A3A3]">No data</div>
                                )}
                            </ChartCard>
                        </div>

                        {/* Activity log */}
                        <section className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-lg font-semibold text-[#0A1128]">Activity log</h2>
                                <span className="text-xs text-[#A3A3A3]">{activity.length} entries</span>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6 py-4 text-sm font-semibold text-[#0A1128]">
                                                Activity
                                            </TableHead>
                                            <TableHead className="px-6 py-4 text-sm font-semibold text-[#0A1128]">
                                                Detail
                                            </TableHead>
                                            <TableHead className="px-6 py-4 text-sm font-semibold text-[#0A1128]">
                                                When
                                            </TableHead>
                                            <TableHead className="px-6 py-4 text-right text-sm font-semibold text-[#0A1128]">
                                                Interviews
                                            </TableHead>
                                            <TableHead className="px-6 py-4 text-right text-sm font-semibold text-[#0A1128]">
                                                CVs
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activity.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="px-6 py-10 text-center text-sm text-[#525252]">
                                                    No activity in this window.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            activity.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="whitespace-nowrap px-6 py-5 text-sm font-semibold text-[#0A1128]">
                                                        {item.subject}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5 text-sm text-[#525252]">
                                                        {item.detail || "—"}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap px-6 py-5 text-sm text-[#525252]">
                                                        {new Date(item.when).toLocaleDateString(undefined, {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5 text-right text-sm font-semibold tabular-nums">
                                                        {item.delta_interviews ? (
                                                            <span style={{ color: item.delta_interviews > 0 ? "#166534" : "#0A1128" }}>
                                                                {item.delta_interviews > 0 ? "+" : ""}
                                                                {item.delta_interviews}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#A3A3A3]">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5 text-right text-sm font-semibold tabular-nums">
                                                        {item.delta_cvs ? (
                                                            <span style={{ color: item.delta_cvs > 0 ? "#166534" : "#0A1128" }}>
                                                                {item.delta_cvs > 0 ? "+" : ""}
                                                                {item.delta_cvs}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#A3A3A3]">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </section>
                    </>
                ) : (
                    !error && (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
                            <LineChart className="h-8 w-8 text-[#A3A3A3]" />
                            <p className="text-sm font-semibold text-[#0A1128]">No analytics data for this window</p>
                            <p className="text-xs text-[#A3A3A3]">Try a wider range above.</p>
                        </div>
                    )
                )}
            </div>
        </MainLayout>
    )
}
