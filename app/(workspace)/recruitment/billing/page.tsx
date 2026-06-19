"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient, type BillingSummary } from "@/lib/recruitment/api-client"
import {
    AlertCircle,
    ArrowRight,
    FileText,
    LineChart,
    Video,
} from "lucide-react"

// ─── Components ──────────────────────────────────────────────────────────────

function QuotaCard({
    label,
    icon: Icon,
    bought,
    used,
    remaining,
    pct,
    unit,
}: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    bought: number
    used: number
    remaining: number
    pct: number
    unit: string
}) {
    const tone =
        pct >= 90
            ? { fg: "#991B1B", bg: "#FEF2F2", border: "#FECACA", bar: "#DC2626", label: "Critical" }
            : pct >= 75
                ? { fg: "#9A3412", bg: "#FFF7ED", border: "#FED7AA", bar: "#F97316", label: "Running low" }
                : { fg: "#166534", bg: "#DCFCE7", border: "#BBF7D0", bar: "#16A34A", label: "Healthy" }

    return (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#034078]">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
                        <p className="text-sm font-medium text-[#525252]">This billing period</p>
                    </div>
                </div>
                <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                >
                    <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: tone.bar }}
                        aria-hidden="true"
                    />
                    {tone.label}
                </span>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
                <p className="text-5xl font-bold tabular-nums text-[#0A1128]">
                    {remaining.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-[#525252]">{unit} left</p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
                <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.min(100, pct)}%`, background: tone.bar }}
                />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">Bought</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-[#0A1128]">
                        {bought.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">Used</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-[#0A1128]">
                        {used.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">Remaining</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-[#0A1128]">
                        {remaining.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
    const [summary, setSummary] = useState<BillingSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await apiClient.getBillingSummary()
                if (!cancelled) setSummary(data)
            } catch (err: any) {
                if (!cancelled) setError(err?.message || "Failed to load billing summary.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const plan = summary?.plan
    const interviewsBought = plan?.interviews.bought ?? 0
    const interviewsUsed = plan?.interviews.used ?? 0
    const interviewsRemaining = Math.max(0, interviewsBought - interviewsUsed)
    const interviewsPct = interviewsBought > 0 ? (interviewsUsed / interviewsBought) * 100 : 0
    const cvsBought = plan?.cvs.bought ?? 0
    const cvsUsed = plan?.cvs.used ?? 0
    const cvsRemaining = Math.max(0, cvsBought - cvsUsed)
    const cvsPct = cvsBought > 0 ? (cvsUsed / cvsBought) * 100 : 0
    const lowBalance = interviewsPct >= 75 || cvsPct >= 75

    const renewedLabel = useMemo(
        () =>
            plan?.renewed_at
                ? new Date(plan.renewed_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                  })
                : "—",
        [plan?.renewed_at],
    )
    const nextRenewalLabel = useMemo(
        () =>
            plan?.next_renewal
                ? new Date(plan.next_renewal).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                  })
                : "—",
        [plan?.next_renewal],
    )

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
            <div className="mx-auto max-w-6xl space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Account</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Wallet &amp; Billing</h1>
                        <p className="mt-1 text-sm text-[#525252]">
                            How many interviews and CV evaluations you have in your current plan.
                        </p>
                    </div>
                    <Link
                        href="/recruitment/billing/analytics"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#034078] px-3 py-2 text-sm font-medium text-[#034078] transition-colors hover:bg-[#034078] hover:text-white"
                    >
                        <LineChart className="h-4 w-4" />
                        View usage analytics
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {!error && plan && lowBalance && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">Your quota is running low</p>
                            <p className="mt-0.5 text-amber-700/90">
                                Renewal scheduled for {nextRenewalLabel}. To bump the limit sooner, contact your account manager.
                            </p>
                        </div>
                    </div>
                )}

                {plan && (
                    <>
                        {/* Plan hero */}
                        <section className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
                                        Current plan
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-[#0A1128]">{plan.name}</p>
                                    <p className="mt-1 text-sm text-[#525252]">
                                        {plan.period} · Renewed {renewedLabel} · Next renewal {nextRenewalLabel}
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                                    Active
                                </span>
                            </div>
                        </section>

                        {/* Quotas */}
                        <div className="grid gap-4 lg:grid-cols-2">
                            <QuotaCard
                                label="Interviews"
                                icon={Video}
                                bought={interviewsBought}
                                used={interviewsUsed}
                                remaining={interviewsRemaining}
                                pct={interviewsPct}
                                unit="interviews"
                            />
                            <QuotaCard
                                label="CV evaluations"
                                icon={FileText}
                                bought={cvsBought}
                                used={cvsUsed}
                                remaining={cvsRemaining}
                                pct={cvsPct}
                                unit="CVs"
                            />
                        </div>
                    </>
                )}

                {/* Recent activity */}
                <section className="space-y-3">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-lg font-semibold text-[#0A1128]">Recent activity</h2>
                        <Link
                            href="/recruitment/billing/analytics"
                            className="text-xs font-medium text-[#034078] hover:underline"
                        >
                            See all →
                        </Link>
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
                                {(summary?.recent_activity ?? []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-6 py-10 text-center text-sm text-[#525252]">
                                            No activity yet for this billing period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    summary!.recent_activity.map((item) => (
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
                                                    <span
                                                        style={{
                                                            color: item.delta_interviews > 0 ? "#166534" : "#0A1128",
                                                        }}
                                                    >
                                                        {item.delta_interviews > 0 ? "+" : ""}
                                                        {item.delta_interviews}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#A3A3A3]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 py-5 text-right text-sm font-semibold tabular-nums">
                                                {item.delta_cvs ? (
                                                    <span
                                                        style={{
                                                            color: item.delta_cvs > 0 ? "#166534" : "#0A1128",
                                                        }}
                                                    >
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
            </div>
        </MainLayout>
    )
}
