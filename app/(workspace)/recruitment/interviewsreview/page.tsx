"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/recruitment/layout/main-layout'
import { apiClient } from '@/lib/recruitment/api-client'
import type { InterviewSession } from '@/lib/recruitment/types'
import { Input } from '@/components/ui/input'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListTodo,
  Lock,
  Search,
  Star,
  Users,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const s = new Date(start.replace(' ', 'T')).getTime()
  const e = new Date(end.replace(' ', 'T')).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return '—'
  const totalSeconds = Math.floor((e - s) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function statusTone(status: InterviewSession['status']) {
  switch (status) {
    case 'Completed':
      return { dot: '#28C76F', text: '#166534', bg: '#DCFCE7', border: '#BBF7D0' }
    case 'In Progress':
      return { dot: '#1282A2', text: '#034078', bg: '#EFF6FF', border: '#BFDBFE' }
    case 'Scheduled':
      return { dot: '#F97316', text: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' }
    case 'Failed':
      return { dot: '#EF4444', text: '#991B1B', bg: '#FEF2F2', border: '#FECACA' }
    default:
      return { dot: '#A3A3A3', text: '#525252', bg: '#F5F5F5', border: '#E5E5E5' }
  }
}

function ratingTone(rating: number): string {
  if (rating >= 4) return '#16A34A'
  if (rating >= 3) return '#034078'
  if (rating >= 2) return '#D97706'
  return '#DC2626'
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  accent?: 'brand' | 'amber' | 'emerald' | 'gray'
}) {
  const accentColor =
    accent === 'brand'
      ? '#034078'
      : accent === 'amber'
        ? '#9A3412'
        : accent === 'emerald'
          ? '#166534'
          : '#525252'
  const accentBg =
    accent === 'brand'
      ? '#EFF6FF'
      : accent === 'amber'
        ? '#FFF7ED'
        : accent === 'emerald'
          ? '#DCFCE7'
          : '#F5F5F5'
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accentBg, color: accentColor }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[#0A1128]">{value}</p>
    </div>
  )
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
      style={
        active
          ? { background: '#034078', color: '#fff', borderColor: '#034078' }
          : { background: '#fff', color: '#525252', borderColor: '#E5E5E5' }
      }
    >
      {children}
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={
          active
            ? { background: 'rgba(255,255,255,0.2)', color: '#fff' }
            : { background: '#F5F5F5', color: '#525252' }
        }
      >
        {count}
      </span>
    </button>
  )
}

function StatusPill({ status }: { status: InterviewSession['status'] }) {
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

function RatingCell({
  interview,
  isReviewed,
}: {
  interview: InterviewSession
  isReviewed: boolean
}) {
  if (interview.status !== 'Completed') {
    return <span className="text-sm text-[#A3A3A3]">—</span>
  }
  if (!isReviewed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#A3A3A3]">
        <Lock className="h-3 w-3" />
        Review first
      </span>
    )
  }
  if (typeof interview.score !== 'number') {
    return <span className="text-sm text-[#A3A3A3]">—</span>
  }
  const rating = interview.score / 20
  const tone = ratingTone(rating)
  return (
    <span className="inline-flex items-center gap-1 text-sm tabular-nums">
      <Star className="h-3.5 w-3.5 fill-current" style={{ color: tone }} />
      <span className="font-semibold text-[#0A1128]">{rating.toFixed(1)}</span>
      <span className="text-xs text-[#A3A3A3]">/ 5</span>
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'awaiting' | 'reviewed' | 'in_progress'

export default function InterviewsReviewPage() {
  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const response = await apiClient.getInterviewSessions()
        if (!cancelled) setInterviews(response.data)
      } catch (err) {
        if (!cancelled) setError('Failed to load interviews')
        console.error('Error fetching interviews:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const completed = interviews.filter((i) => i.status === 'Completed')
    const awaiting = completed.filter((i) => !i.hr_comment)
    const reviewed = completed.filter((i) => !!i.hr_comment)
    const inProgress = interviews.filter((i) => i.status === 'In Progress' || i.status === 'Scheduled')
    return {
      all: interviews.length,
      awaiting: awaiting.length,
      reviewed: reviewed.length,
      inProgress: inProgress.length,
      completed: completed.length,
    }
  }, [interviews])

  const filtered = useMemo(() => {
    const byFilter = interviews.filter((i) => {
      if (filter === 'awaiting') return i.status === 'Completed' && !i.hr_comment
      if (filter === 'reviewed') return i.status === 'Completed' && !!i.hr_comment
      if (filter === 'in_progress') return i.status === 'In Progress' || i.status === 'Scheduled'
      return true
    })
    const q = search.trim().toLowerCase()
    const bySearch = q
      ? byFilter.filter(
          (i) =>
            (i.candidate_name || '').toLowerCase().includes(q) ||
            (i.job_title || '').toLowerCase().includes(q)
        )
      : byFilter
    // Most recently ended first; in-progress and others fall back to creation.
    return [...bySearch].sort((a, b) => {
      const at = new Date(a.end_time || a.creation || 0).getTime()
      const bt = new Date(b.end_time || b.creation || 0).getTime()
      return bt - at
    })
  }, [interviews, filter, search])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-9 w-9 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-5xl">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Couldn&apos;t load interviews</p>
              <p className="mt-1 text-sm text-red-700/80">{error}</p>
            </div>
          </div>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
              Recruitment
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#0A1128]">Interview Reviews</h1>
            <p className="mt-1 text-sm text-[#525252]">
              Review completed interviews and submit your assessment before the AI verdict is revealed.
            </p>
          </div>
          {counts.awaiting > 0 && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
              style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}
            >
              <ListTodo className="h-4 w-4" />
              {counts.awaiting} awaiting your review
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={counts.all} icon={Users} accent="gray" />
          <StatCard label="Awaiting review" value={counts.awaiting} icon={ListTodo} accent="amber" />
          <StatCard label="Reviewed" value={counts.reviewed} icon={CheckCircle2} accent="emerald" />
          <StatCard label="In progress" value={counts.inProgress} icon={Clock} accent="brand" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')}>
              All
            </FilterChip>
            <FilterChip
              active={filter === 'awaiting'}
              count={counts.awaiting}
              onClick={() => setFilter('awaiting')}
            >
              Awaiting review
            </FilterChip>
            <FilterChip
              active={filter === 'reviewed'}
              count={counts.reviewed}
              onClick={() => setFilter('reviewed')}
            >
              Reviewed
            </FilterChip>
            <FilterChip
              active={filter === 'in_progress'}
              count={counts.inProgress}
              onClick={() => setFilter('in_progress')}
            >
              In progress
            </FilterChip>
          </div>
          <div className="relative max-w-sm flex-1 lg:flex-initial lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate or position…"
              className="pl-9 border-[#E5E5E5] focus:border-[#034078]"
            />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F5]">
              <ListTodo className="h-5 w-5 text-[#A3A3A3]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#0A1128]">
              {search
                ? 'No interviews match your search'
                : filter === 'awaiting'
                  ? 'Nothing waiting on you'
                  : filter === 'reviewed'
                    ? 'No reviewed interviews yet'
                    : 'No interviews yet'}
            </p>
            <p className="text-sm text-[#A3A3A3]">
              {filter === 'awaiting'
                ? 'New completed interviews will land here for review.'
                : 'Try a different filter or check back later.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
            {/* Table header — desktop */}
            <div className="hidden grid-cols-[1.6fr_1.4fr_140px_140px_110px_140px_80px] items-center gap-4 border-b border-[#E5E5E5] px-6 py-4 text-sm font-semibold text-[#0A1128] lg:grid">
              <div>Candidate</div>
              <div>Position</div>
              <div>Status</div>
              <div>Completed</div>
              <div>Duration</div>
              <div>Rating</div>
              <div className="text-right">
                <span className="sr-only">Action</span>
              </div>
            </div>

            <ul className="divide-y divide-[#F0F0F0]">
              {filtered.map((interview) => {
                const isReviewed = !!interview.hr_comment
                const isAwaiting = interview.status === 'Completed' && !isReviewed
                return (
                  <li
                    key={interview.name}
                    className="grid grid-cols-1 gap-3 px-6 py-5 lg:grid-cols-[1.6fr_1.4fr_140px_140px_110px_140px_80px] lg:items-center lg:gap-4"
                  >
                    {/* Candidate */}
                    <div className="min-w-0">
                      <Link
                        href={`/recruitment/interviewsreview/${interview.name}`}
                        className="block truncate text-sm font-semibold text-[#0A1128] hover:text-[#034078]"
                      >
                        {interview.candidate_name || '—'}
                      </Link>
                      <p className="truncate text-xs text-[#A3A3A3] lg:hidden">
                        {interview.job_title || '—'}
                      </p>
                    </div>

                    {/* Position — desktop column */}
                    <div className="hidden truncate text-sm text-[#525252] lg:block">
                      {interview.job_title || '—'}
                    </div>

                    {/* Status */}
                    <div className="text-sm">
                      <StatusPill status={interview.status} />
                    </div>

                    {/* Completed at — desktop */}
                    <div className="hidden text-sm text-[#525252] lg:block">
                      {interview.end_time
                        ? new Date(interview.end_time.replace(' ', 'T')).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </div>

                    {/* Duration — desktop */}
                    <div className="hidden text-sm text-[#525252] lg:block">
                      {formatElapsed(interview.start_time, interview.end_time)}
                    </div>

                    {/* Rating */}
                    <div className="text-sm">
                      <RatingCell interview={interview} isReviewed={isReviewed} />
                    </div>

                    {/* Action */}
                    <div className="text-sm font-medium lg:text-right">
                      <Link
                        href={`/recruitment/interviewsreview/${interview.name}`}
                        className="font-semibold text-[#034078] hover:text-[#0A1128]"
                      >
                        {isAwaiting ? 'Review' : 'View'}
                        <span className="sr-only">, {interview.candidate_name || 'interview'}</span>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-4 text-xs text-[#A3A3A3]">
              <span>
                Showing {filtered.length} of {counts.all}
              </span>
              {counts.awaiting > 0 && filter !== 'awaiting' && (
                <button
                  type="button"
                  onClick={() => setFilter('awaiting')}
                  className="font-medium text-[#034078] hover:underline"
                >
                  Jump to {counts.awaiting} awaiting review →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
