"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Video,
  FileBarChart,
  Star,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { MainLayout } from "@/components/recruitment/layout/main-layout"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/recruitment/api-client"
import type { InterviewSession } from "@/lib/recruitment/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeMs(s?: string | null): number | null {
  if (!s) return null
  const t = new Date(s.replace(" ", "T")).getTime()
  return Number.isFinite(t) ? t : null
}

function elapsedMinutes(start?: string | null, end?: string | null): number | null {
  const s = safeMs(start)
  const e = safeMs(end)
  if (s === null || e === null || e <= s) return null
  return Math.round((e - s) / 60000)
}

function fmtMinutes(m: number | null): string {
  if (m === null) return "—"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

function fmtDate(s?: string | null): string {
  const t = safeMs(s ?? null)
  if (t === null) return "—"
  return new Date(t).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusTone(status: InterviewSession["status"]) {
  switch (status) {
    case "Completed":
      return { dot: "#28C76F", text: "#166534", bg: "#DCFCE7", border: "#BBF7D0" }
    case "In Progress":
      return { dot: "#1282A2", text: "#034078", bg: "#EFF6FF", border: "#BFDBFE" }
    case "Scheduled":
      return { dot: "#F97316", text: "#9A3412", bg: "#FFF7ED", border: "#FED7AA" }
    case "Failed":
      return { dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2", border: "#FECACA" }
    default:
      return { dot: "#A3A3A3", text: "#525252", bg: "#F5F5F5", border: "#E5E5E5" }
  }
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  accent?: "brand" | "amber" | "emerald" | "gray"
}) {
  const accentColor =
    accent === "brand"
      ? "#034078"
      : accent === "amber"
        ? "#9A3412"
        : accent === "emerald"
          ? "#166534"
          : "#525252"
  const accentBg =
    accent === "brand"
      ? "#EFF6FF"
      : accent === "amber"
        ? "#FFF7ED"
        : accent === "emerald"
          ? "#DCFCE7"
          : "#F5F5F5"
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
          {label}
        </p>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accentBg, color: accentColor }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#0A1128]">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{hint}</p>}
    </div>
  )
}

function StatusPill({ status }: { status: InterviewSession["status"] }) {
  const tone = statusTone(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
      {status}
    </span>
  )
}

/** Horizontal bar for one row of a breakdown. Bar length is
 *  proportional to `count / max`, capped at 100%. */
function BreakdownRow({
  label,
  count,
  max,
  swatch,
}: {
  label: string
  count: number
  max: number
  swatch: string
}) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0 truncate text-sm text-[#0A1128]" title={label}>
        {label}
      </div>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: swatch }}
        />
      </div>
      <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-[#0A1128]">
        {count}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewReportsPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const response = await apiClient.getInterviewSessions()
        if (!cancelled) setSessions(response.data ?? [])
      } catch (err) {
        console.error("Error fetching interviews:", err)
        if (!cancelled) setError("Couldn't load interview data. Try refreshing.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0,
        failed: 0,
        avgDurationMin: null as number | null,
        avgScore: null as number | null,
        byJob: [] as Array<{ label: string; count: number }>,
        byStatus: [] as Array<{ label: string; count: number; color: string }>,
        recent: [] as InterviewSession[],
      }
    }
    const completed = sessions.filter((s) => s.status === "Completed")
    const inProgress = sessions.filter((s) => s.status === "In Progress").length
    const scheduled = sessions.filter((s) => s.status === "Scheduled").length
    const failed = sessions.filter((s) => s.status === "Failed").length

    // Avg duration only across completed sessions with usable timestamps.
    const durations = completed
      .map((s) => elapsedMinutes(s.started_at ?? s.start_time, s.end_time))
      .filter((n): n is number => n !== null)
    const avgDurationMin =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null

    // Avg score across completed sessions with numeric score. Score is
    // stored 0–100 on the doc; convert to 0–5 for display.
    const scores = completed
      .map((s) => (typeof s.score === "number" ? s.score : null))
      .filter((n): n is number => n !== null)
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length / 20
        : null

    // Top jobs by interview volume (top 5).
    const jobCounts = new Map<string, number>()
    for (const s of sessions) {
      const label = s.job_title || s.job_posting || "—"
      jobCounts.set(label, (jobCounts.get(label) ?? 0) + 1)
    }
    const byJob = Array.from(jobCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Status breakdown for the horizontal bars.
    const byStatus = [
      { label: "Completed", count: completed.length, color: "#28C76F" },
      { label: "In Progress", count: inProgress, color: "#1282A2" },
      { label: "Scheduled", count: scheduled, color: "#F97316" },
      { label: "Failed", count: failed, color: "#EF4444" },
    ].filter((r) => r.count > 0)

    // Most recent 8 completed sessions for the drill-down table.
    const recent = [...completed]
      .sort(
        (a, b) =>
          (safeMs(b.end_time) ?? safeMs(b.started_at ?? b.start_time) ?? 0) -
          (safeMs(a.end_time) ?? safeMs(a.started_at ?? a.start_time) ?? 0),
      )
      .slice(0, 8)

    return {
      total: sessions.length,
      completed: completed.length,
      inProgress,
      scheduled,
      failed,
      avgDurationMin,
      avgScore,
      byJob,
      byStatus,
      recent,
    }
  }, [sessions])

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1282A2]">
            Reports
          </p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A1128]">
            Interview reports
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#525252]">
            Aggregated view across every interview session — volume, throughput,
            average quality, and top jobs by activity.
          </p>
        </div>

        {loading && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-10 text-center text-sm text-[#525252]">
            Loading interview data…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {!loading && !error && stats.total === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl"
              style={{ background: "#1282A2" }}
              aria-hidden="true"
            />
            <p className="relative text-base font-semibold text-[#0A1128]">
              No interview sessions yet
            </p>
            <p className="relative mx-auto mt-1 max-w-md text-sm text-[#525252]">
              Once candidates go through interviews, this page will summarise
              throughput, ratings, and top jobs by activity.
            </p>
            <div className="relative mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/recruitment/interviewsreview">
                <Button className="bg-[#034078] text-white hover:bg-[#0A1128]">
                  <Video className="mr-2 h-4 w-4" />
                  Open interview reviews
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/recruitment/reports">
                <Button
                  variant="outline"
                  className="border-[#E5E5E5] text-[#525252] hover:text-[#0A1128]"
                >
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Shortlist reports
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && stats.total > 0 && (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Total"
                value={stats.total}
                icon={Users}
                accent="brand"
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={CheckCircle2}
                accent="emerald"
              />
              <StatCard
                label="In progress"
                value={stats.inProgress}
                icon={Clock}
                accent="brand"
              />
              <StatCard
                label="Scheduled"
                value={stats.scheduled}
                icon={Clock}
                accent="amber"
              />
              <StatCard
                label="Avg duration"
                value={fmtMinutes(stats.avgDurationMin)}
                hint="Completed sessions"
                icon={TrendingUp}
              />
              <StatCard
                label="Avg score"
                value={stats.avgScore === null ? "—" : `${stats.avgScore.toFixed(1)}/5`}
                hint="Completed sessions"
                icon={Star}
                accent="brand"
              />
            </div>

            {/* Breakdown row: status + top jobs */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#034078]" />
                  <h2 className="text-sm font-semibold text-[#0A1128]">
                    By status
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {stats.byStatus.map((r) => (
                    <BreakdownRow
                      key={r.label}
                      label={r.label}
                      count={r.count}
                      max={stats.total}
                      swatch={r.color}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-[#E5E5E5] bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#034078]" />
                  <h2 className="text-sm font-semibold text-[#0A1128]">
                    Top jobs by activity
                  </h2>
                </div>
                {stats.byJob.length === 0 ? (
                  <p className="text-sm text-[#A3A3A3]">No sessions yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stats.byJob.map((r) => (
                      <BreakdownRow
                        key={r.label}
                        label={r.label}
                        count={r.count}
                        max={stats.byJob[0].count}
                        swatch="#034078"
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Recent completed sessions */}
            <section className="rounded-xl border border-[#E5E5E5] bg-white">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#034078]" />
                  <h2 className="text-sm font-semibold text-[#0A1128]">
                    Recent completed interviews
                  </h2>
                </div>
                <Link
                  href="/recruitment/interviewsreview"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#034078] hover:underline"
                >
                  All interviews
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {stats.recent.length === 0 ? (
                <p className="p-6 text-sm text-[#A3A3A3]">
                  No completed sessions yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#F5F5F5]">
                  {stats.recent.map((s) => {
                    const dur = elapsedMinutes(
                      s.started_at ?? s.start_time,
                      s.end_time,
                    )
                    const rating =
                      typeof s.score === "number" ? s.score / 20 : null
                    return (
                      <li
                        key={s.name}
                        className="flex items-center gap-4 px-5 py-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#0A1128]">
                            {s.candidate_name || s.candidate_application || "—"}
                          </p>
                          <p className="truncate text-[11px] text-[#A3A3A3]">
                            {s.job_title || s.job_posting || "—"}
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-xs text-[#525252] sm:block">
                          {fmtDate(s.end_time ?? s.started_at ?? s.start_time)}
                        </div>
                        <div className="hidden shrink-0 text-xs text-[#525252] md:block">
                          {fmtMinutes(dur)}
                        </div>
                        <div className="shrink-0">
                          {rating === null ? (
                            <span className="text-xs text-[#A3A3A3]">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                              <Star
                                className="h-3.5 w-3.5 fill-current"
                                style={{ color: "#F59E0B" }}
                              />
                              <span className="font-semibold text-[#0A1128]">
                                {rating.toFixed(1)}
                              </span>
                              <span className="text-xs text-[#A3A3A3]">/5</span>
                            </span>
                          )}
                        </div>
                        <div className="hidden shrink-0 md:block">
                          <StatusPill status={s.status} />
                        </div>
                        <Link
                          href={`/recruitment/interviewsreview/${encodeURIComponent(s.name)}`}
                          className="shrink-0 rounded-md p-1.5 text-[#A3A3A3] transition hover:bg-[#F5F5F5] hover:text-[#034078]"
                          aria-label={`Open ${s.name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </MainLayout>
  )
}
