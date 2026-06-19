"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { MainLayout } from '@/components/recruitment/layout/main-layout'
import { apiClient } from '@/lib/recruitment/api-client'
import type { InterviewSession, InterviewEvaluation } from '@/lib/recruitment/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Pause,
  Play,
  Sparkles,
  User,
  Video,
} from 'lucide-react'
import { EvaluationDisplay } from '@/components/recruitment/interviews/evaluation-display'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

function formatDateLong(date?: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calculateDurationMinutes(start: Date | null, end?: string | null): string {
  if (!start || !end) return '—'
  const diffMs = new Date(end).getTime() - start.getTime()
  if (diffMs <= 0) return '—'
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return hours > 0 ? `${hours}h ${remaining}m` : `${mins}m`
}

function extractStartTimeFromTranscript(transcript?: string | null): Date | null {
  if (!transcript) return null
  const match = transcript.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/)
  return match ? new Date(match[1]) : null
}

function isYouTubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getYouTubeEmbedUrl(url: string) {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
  const videoId = match && match[2].length === 11 ? match[2] : null
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

// Parse the candidate-side transcript "[ISO] Sender: text" lines into structured
// rows so we can render a nicely styled transcript instead of a raw <pre>.
type TranscriptLine = { time: string | null; sender: string; text: string; isAgent: boolean }

function parseTranscript(transcript?: string | null): TranscriptLine[] {
  if (!transcript) return []
  const lines = transcript.split('\n')
  const rows: TranscriptLine[] = []
  const re = /^\[([^\]]+)\]\s+([^:]+):\s*(.*)$/
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const m = trimmed.match(re)
    if (m) {
      const senderRaw = m[2].trim()
      const isAgent = /^assistant|agent|interviewer/i.test(senderRaw)
      // Format the time as HH:MM if it looks like ISO; otherwise keep as-is.
      let timeLabel: string | null = m[1]
      const parsed = new Date(m[1])
      if (!Number.isNaN(parsed.getTime())) {
        timeLabel = parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      rows.push({ time: timeLabel, sender: senderRaw, text: m[3], isAgent })
    } else {
      // Continuation of the prior speaker without a timestamp prefix.
      const last = rows[rows.length - 1]
      if (last) last.text = `${last.text}\n${trimmed}`
    }
  }
  return rows
}

// ─── Internal components ──────────────────────────────────────────────────────

function CandidateHero({
  interview,
  duration,
  startedAt,
}: {
  interview: InterviewSession
  duration: string
  startedAt: Date | null
}) {
  const tone = statusTone(interview.status)
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-2xl font-bold text-[#0A1128] truncate sm:text-[28px]">
              {interview.candidate_name}
            </h1>
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
              {interview.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#525252]">{interview.job_title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A3A3A3]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {duration}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" /> {formatDateLong(startedAt ?? interview.creation)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono">
              <span className="opacity-60">id</span> {interview.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepStrip({
  recordingDone,
  hrSubmitted,
}: {
  recordingDone: boolean
  hrSubmitted: boolean
}) {
  const steps = [
    { label: 'Review recording', done: recordingDone },
    { label: 'Submit your assessment', done: hrSubmitted },
    { label: 'AI analysis revealed', done: hrSubmitted },
  ]
  // Current = first step that isn't done (capped to last index).
  const currentIdx = Math.min(steps.findIndex((s) => !s.done), steps.length - 1)
  const resolvedCurrent = currentIdx === -1 ? steps.length - 1 : currentIdx

  return (
    <ol className="flex items-stretch gap-1.5 overflow-x-auto rounded-xl border border-[#E5E5E5] bg-white p-1.5">
      {steps.map((step, i) => {
        const isDone = step.done
        const isActive = !isDone && i === resolvedCurrent
        return (
          <li key={step.label} className="flex flex-1 min-w-fit items-center gap-2.5 px-3 py-2">
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={
                isDone
                  ? { background: '#28C76F', color: '#fff' }
                  : isActive
                    ? { background: '#034078', color: '#fff' }
                    : { background: '#F5F5F5', color: '#A3A3A3', border: '1px solid #E5E5E5' }
              }
            >
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: isDone ? '#166534' : isActive ? '#0A1128' : '#A3A3A3' }}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function StepCard({
  stepNumber,
  done,
  active,
  title,
  hint,
  children,
  rightAdornment,
}: {
  stepNumber: number
  done?: boolean
  active?: boolean
  title: string
  hint?: string
  children: React.ReactNode
  rightAdornment?: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow"
      style={{
        borderColor: active ? '#BFDBFE' : '#E5E5E5',
        boxShadow: active ? '0 0 0 4px rgba(3, 64, 120, 0.06)' : undefined,
      }}
    >
      <header className="flex items-start gap-3 border-b border-[#E5E5E5] px-6 py-4">
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={
            done
              ? { background: '#28C76F', color: '#fff' }
              : active
                ? { background: '#034078', color: '#fff' }
                : { background: '#F5F5F5', color: '#A3A3A3', border: '1px solid #E5E5E5' }
          }
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[#0A1128]">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-[#525252]">{hint}</p>}
        </div>
        {rightAdornment}
      </header>
      <div className="p-6">{children}</div>
    </section>
  )
}

interface RecordingPlayerProps {
  sessionId: string
  recordingUrl: string
  onPlayed: () => void
}

function InlineVideoPlayer({ sessionId, recordingUrl, onPlayed }: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const playedReportedRef = useRef(false)

  if (isYouTubeUrl(recordingUrl)) {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <iframe
          src={getYouTubeEmbedUrl(recordingUrl)}
          className="aspect-video w-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Interview recording"
        />
      </div>
    )
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => undefined)
    else v.pause()
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="aspect-video w-full"
        controls
        preload="metadata"
        src={`/api/recordings/stream?sessionId=${encodeURIComponent(sessionId)}`}
        onPlay={() => {
          setPlaying(true)
          if (!playedReportedRef.current) {
            playedReportedRef.current = true
            onPlayed()
          }
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        Your browser does not support the video tag.
      </video>

      {!playing && !playedReportedRef.current && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play recording"
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl ring-4 ring-white/20 transition-transform group-hover:scale-105">
            <Play className="h-7 w-7 fill-[#034078] text-[#034078]" />
          </span>
        </button>
      )}
    </div>
  )
}

function RecordingPanel({
  interview,
  sessionId,
  onPlayed,
}: {
  interview: InterviewSession
  sessionId: string
  onPlayed: () => void
}) {
  const eg = interview.egress_status
  const ready = eg === 'Ended' && !!interview.recording_url
  const legacyReady = !eg && !!interview.recording_url
  const processing =
    eg === 'Requested' || eg === 'Active' || (!eg && !interview.recording_url && !!interview.end_time)
  const failed = eg === 'Failed' || eg === 'Aborted'

  if (ready || legacyReady) {
    return <InlineVideoPlayer sessionId={sessionId} recordingUrl={interview.recording_url!} onPlayed={onPlayed} />
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-6 py-12 text-center">
        <div className="mb-3 h-10 w-10 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-[#0A1128]">Recording is processing</p>
        <p className="mt-1 max-w-sm text-xs text-[#525252]">
          This usually takes under a minute after the interview ends. The page refreshes automatically when the file is ready.
        </p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <AlertCircle className="mb-2 h-8 w-8 text-red-600" />
        <p className="text-sm font-semibold text-red-700">Recording unavailable</p>
        <p className="mt-1 max-w-sm text-xs text-red-700/80">
          {interview.egress_error || 'The server-side recording job did not complete.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-6 py-12 text-center">
      <Video className="mb-2 h-8 w-8 text-[#A3A3A3]" />
      <p className="text-sm text-[#525252]">No recording was captured for this interview.</p>
    </div>
  )
}

function TranscriptPanel({ transcript }: { transcript?: string | null }) {
  const rows = useMemo(() => parseTranscript(transcript), [transcript])
  const [expanded, setExpanded] = useState(false)

  if (!transcript) {
    return (
      <div className="rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] p-4 text-xs text-[#A3A3A3]">
        No transcript captured.
      </div>
    )
  }

  if (rows.length === 0) {
    // Fallback for transcripts that didn't parse into structured rows.
    return (
      <div className="rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-[#525252]">
          {transcript}
        </pre>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0A1128]">
          <Sparkles className="h-3.5 w-3.5 text-[#1282A2]" />
          Transcript
          <span className="text-xs font-normal text-[#A3A3A3]">· {rows.length} turns</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-[#034078] hover:underline"
        >
          {expanded ? (<>Collapse <ChevronUp className="h-3 w-3" /></>) : (<>Expand <ChevronDown className="h-3 w-3" /></>)}
        </button>
      </header>
      <div className={expanded ? 'max-h-[640px] overflow-y-auto' : 'max-h-80 overflow-y-auto'}>
        <ul className="divide-y divide-[#F0F0F0]">
          {rows.map((row, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: row.isAgent ? '#1282A2' : '#034078' }}
                >
                  {row.isAgent ? 'AI Interviewer' : row.sender || 'Candidate'}
                </span>
                {row.time && <span className="text-[10px] text-[#A3A3A3]">{row.time}</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#171717]">{row.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const radius = 38
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, score / 100)))
  const color = score >= 80 ? '#28C76F' : score >= 60 ? '#1282A2' : score >= 40 ? '#F97316' : '#EF4444'
  return (
    <div className="relative inline-flex h-24 w-24 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="#F0F0F0" strokeWidth={stroke} fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold leading-none" style={{ color }}>{Math.round(score)}</div>
        <div className="text-[10px] uppercase tracking-wide text-[#A3A3A3]">/ 100</div>
      </div>
    </div>
  )
}

function recommendationStyle(rec?: string) {
  switch (rec) {
    case 'Strong Hire':
      return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }
    case 'Hire':
      return { bg: '#EFF6FF', text: '#034078', border: '#BFDBFE' }
    case 'Maybe':
      return { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' }
    case 'Reject':
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }
    default:
      return { bg: '#F5F5F5', text: '#525252', border: '#E5E5E5' }
  }
}

function readEvaluation(value: InterviewEvaluation | string | null | undefined): InterviewEvaluation | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as InterviewEvaluation) : null
    } catch {
      return null
    }
  }
  return value as InterviewEvaluation
}

function AiAnalysisCard({ interview }: { interview: InterviewSession }) {
  const final = readEvaluation(interview.final_ai_evaluation)
  const initial = readEvaluation(interview.ai_evaluation)
  const primary = final || initial
  const overall = primary?.overall_score ?? interview.score ?? null
  const recommendation = primary?.recommendation
  const recStyle = recommendationStyle(recommendation)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-[#E5E5E5] bg-white p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        {typeof overall === 'number' && <ScoreRing score={overall} />}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">
            {final ? 'Final AI evaluation' : 'AI evaluation'}
          </p>
          {primary?.summary && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#525252]">
              {primary.summary}
            </p>
          )}
        </div>
        {recommendation && (
          <div className="text-center sm:text-right">
            <p className="text-[10px] uppercase tracking-wide text-[#A3A3A3]">Recommendation</p>
            <span
              className="mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold"
              style={{ background: recStyle.bg, color: recStyle.text, border: `1px solid ${recStyle.border}` }}
            >
              {recommendation}
            </span>
          </div>
        )}
      </div>

      {initial && !final && (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <EvaluationDisplay evaluation={initial} variant="initial" />
        </div>
      )}

      {final && (
        <div className="rounded-xl border border-[#034078]/20 p-5" style={{ background: '#F8FBFF' }}>
          <div className="mb-4 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ background: '#034078' }}
            >
              Post HR comment
            </span>
            <span className="text-xs text-[#525252]">Re-evaluated using your assessment</span>
          </div>
          <EvaluationDisplay evaluation={final} variant="final" />
        </div>
      )}

      {!final && interview.hr_comment && !initial && (
        <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] p-4 text-sm text-[#525252]">
          <div className="h-4 w-4 rounded-full border-2 border-[#034078] border-t-transparent animate-spin" />
          The AI is generating its post-comment evaluation. The page refreshes automatically.
        </div>
      )}

      {(interview.ai_feedback || interview.summary || interview.interviewer_notes) && (
        <details className="group rounded-xl border border-[#E5E5E5] bg-white">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-[#0A1128] flex items-center justify-between">
            More AI notes
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-[#E5E5E5] px-5 py-4">
            {interview.ai_feedback && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Feedback</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#525252]">{interview.ai_feedback}</p>
              </div>
            )}
            {interview.summary && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Summary</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#525252]">{interview.summary}</p>
              </div>
            )}
            {interview.interviewer_notes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">Interviewer notes</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#525252]">{interview.interviewer_notes}</p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewReviewDetailPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [interview, setInterview] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hrComment, setHrComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null)
  const [hasReviewedRecording, setHasReviewedRecording] = useState(false)

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!sessionId) return
      try {
        const response = await apiClient.getInterviewSession(sessionId)
        if (!cancelled) {
          setInterview(response)
          setHrComment(response?.hr_comment || '')
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load interview details')
        console.error('Error fetching interview details:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Poll until egress reaches a terminal state.
  useEffect(() => {
    if (!interview || !sessionId) return
    const status = interview.egress_status
    const isFinal = status === 'Ended' || status === 'Failed' || status === 'Aborted'
    if (isFinal) return
    if (!status && interview.recording_url) return
    const id = setInterval(async () => {
      try {
        const refreshed = await apiClient.getInterviewSession(sessionId)
        setInterview(refreshed)
        const next = refreshed?.egress_status
        if (next === 'Ended' || next === 'Failed' || next === 'Aborted') {
          clearInterval(id)
        }
      } catch (err) {
        console.warn('[egress] poll failed:', err)
      }
    }, 3000)
    return () => clearInterval(id)
  }, [interview, sessionId])

  // Poll for the post-HR-comment final evaluation after submit.
  useEffect(() => {
    if (!interview || !sessionId) return
    if (!interview.hr_comment) return
    if (interview.final_ai_evaluation) return
    const id = setInterval(async () => {
      try {
        const refreshed = await apiClient.getInterviewSession(sessionId)
        setInterview(refreshed)
        if (refreshed?.final_ai_evaluation) clearInterval(id)
      } catch (err) {
        console.warn('[final-eval] poll failed:', err)
      }
    }, 4000)
    return () => clearInterval(id)
  }, [interview, sessionId])

  const startedAt = useMemo(() => {
    if (!interview) return null
    if (interview.start_time) return new Date(interview.start_time)
    if (interview.started_at) return new Date(interview.started_at)
    return extractStartTimeFromTranscript(interview.transcript)
  }, [interview])

  const duration = useMemo(
    () => calculateDurationMinutes(startedAt, interview?.end_time),
    [startedAt, interview?.end_time]
  )

  const handleSubmitHrComment = async () => {
    if (!interview) return
    if (!hrComment.trim()) {
      setCommentError('Please enter your assessment before submitting.')
      return
    }
    if (interview.recording_url && !hasReviewedRecording) {
      setCommentError('Please review the recording before submitting your assessment.')
      return
    }
    try {
      setSubmittingComment(true)
      setCommentError(null)
      setCommentSuccess(null)
      const result = await apiClient.apiCall<{ success: boolean; error?: string }>(
        'recruitment_app.api.interview_sessions.add_hr_comment_and_reevaluate',
        { session_id: interview.name, hr_comment: hrComment.trim() }
      )
      if (result?.success) {
        setCommentSuccess('Your assessment was saved. The AI is preparing its analysis…')
        setTimeout(async () => {
          try {
            const refreshed = await apiClient.getInterviewSession(sessionId)
            setInterview(refreshed)
          } catch {
            /* ignore — the post-submit poll will catch up */
          }
        }, 4000)
      } else {
        setCommentError(result?.error || 'Failed to save your assessment')
      }
    } catch (err) {
      console.error('Failed to submit HR comment:', err)
      setCommentError('Failed to save your assessment')
    } finally {
      setSubmittingComment(false)
    }
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

  if (error || !interview) {
    return (
      <MainLayout>
        <div className="max-w-4xl">
          <Link
            href="/recruitment/interviewsreview"
            className="inline-flex items-center gap-1.5 text-sm text-[#034078] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to interviews
          </Link>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Couldn&apos;t load interview</p>
              <p className="text-sm text-red-700/80 mt-1">{error || 'Interview not found'}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  const aiUnlocked = !!interview.hr_comment
  const isCompleted = interview.status === 'Completed'
  const recordingExists = !!interview.recording_url
  const submitDisabled =
    submittingComment ||
    !hrComment.trim() ||
    (recordingExists && !hasReviewedRecording)

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/recruitment/interviewsreview"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#034078] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Interviews
          </Link>
        </div>

        <CandidateHero interview={interview} duration={duration} startedAt={startedAt} />

        {isCompleted && (
          <StepStrip recordingDone={hasReviewedRecording} hrSubmitted={aiUnlocked} />
        )}

        {/* Step 1 — Recording (+ transcript) */}
        {isCompleted && (
          <StepCard
            stepNumber={1}
            done={hasReviewedRecording}
            active={!hasReviewedRecording}
            title="Review the recording"
            hint="Watch the interview from start to finish before forming your assessment."
            rightAdornment={
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1 text-xs text-[#525252]">
                {hasReviewedRecording ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#28C76F]" /> Reviewed
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-[#A3A3A3]" /> Not yet reviewed
                  </>
                )}
              </span>
            }
          >
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <div>
                <RecordingPanel
                  interview={interview}
                  sessionId={sessionId}
                  onPlayed={() => setHasReviewedRecording(true)}
                />
              </div>
              <TranscriptPanel transcript={interview.transcript} />
            </div>
            {recordingExists && !hasReviewedRecording && (
              <label className="mt-4 flex items-center gap-2 text-xs text-[#525252]">
                <input
                  type="checkbox"
                  checked={hasReviewedRecording}
                  onChange={(e) => setHasReviewedRecording(e.target.checked)}
                  className="accent-[#034078]"
                />
                I&apos;ve reviewed the recording (or will skip ahead and proceed at my own discretion).
              </label>
            )}
          </StepCard>
        )}

        {/* Step 2 — HR assessment */}
        {isCompleted && (
          <StepCard
            stepNumber={2}
            done={aiUnlocked}
            active={hasReviewedRecording && !aiUnlocked}
            title="Your assessment"
            hint={
              aiUnlocked
                ? 'Submitted. Your comment is now being weighed in the AI re-evaluation below.'
                : 'Capture your independent take. The AI verdict unlocks once you submit.'
            }
            rightAdornment={
              !aiUnlocked && (
                <span
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}
                >
                  <Lock className="h-3.5 w-3.5" /> AI verdict locked
                </span>
              )
            }
          >
            {aiUnlocked ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#525252]">
                    <User className="h-3.5 w-3.5" /> Your comment
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#171717]">
                    {interview.hr_comment}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="What stood out — both positively and negatively? Was the candidate's depth, communication, and fit consistent with the role?"
                  value={hrComment}
                  onChange={(e) => setHrComment(e.target.value)}
                  className="min-h-[140px] resize-y border-[#E5E5E5] text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#034078] focus:ring-[#034078]/20"
                />
                {commentError && (
                  <p className="text-sm text-red-600">{commentError}</p>
                )}
                {commentSuccess && (
                  <p className="text-sm text-emerald-600">{commentSuccess}</p>
                )}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#A3A3A3]">
                    {recordingExists && !hasReviewedRecording
                      ? 'Mark the recording reviewed above to enable submit.'
                      : 'Your comment can be revised by the team after submission.'}
                  </p>
                  <Button
                    onClick={handleSubmitHrComment}
                    disabled={submitDisabled}
                    className="bg-[#034078] hover:bg-[#0A1128] text-white"
                  >
                    {submittingComment ? 'Submitting…' : 'Submit assessment & reveal AI'}
                  </Button>
                </div>
              </div>
            )}
          </StepCard>
        )}

        {/* Step 3 — AI analysis (revealed) */}
        <AnimatePresence initial={false}>
          {isCompleted && aiUnlocked && (
            <motion.div
              key="ai-step"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepCard
                stepNumber={3}
                done={!!interview.final_ai_evaluation}
                active={!interview.final_ai_evaluation}
                title="AI analysis"
                hint={
                  interview.final_ai_evaluation
                    ? 'Final evaluation produced after weighing your comment.'
                    : 'AI-generated analysis. The final, post-comment evaluation will appear here once ready.'
                }
              >
                <AiAnalysisCard interview={interview} />
              </StepCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-completed states */}
        {!isCompleted && (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 text-sm text-[#525252]">
            This interview is currently <strong>{interview.status}</strong>. Review tools become available once the
            session is completed.
          </div>
        )}
      </div>
    </MainLayout>
  )
}
