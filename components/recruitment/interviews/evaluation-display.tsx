"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, Sparkles, MinusCircle } from "lucide-react"
import {
  INTERVIEW_QUESTION_CATEGORIES,
  type InterviewEvaluation,
  type InterviewQuestionCategory,
} from "@/lib/recruitment/types"

function tryParse(value: unknown): InterviewEvaluation | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === "object" ? (parsed as InterviewEvaluation) : null
    } catch {
      return null
    }
  }
  if (typeof value === "object") return value as InterviewEvaluation
  return null
}

function scoreTone(score: number) {
  if (score >= 80) return { text: "text-emerald-600", bar: "bg-emerald-500" }
  if (score >= 60) return { text: "text-[#1282A2]", bar: "bg-[#1282A2]" }
  if (score >= 40) return { text: "text-amber-600", bar: "bg-amber-500" }
  if (score > 0) return { text: "text-red-600", bar: "bg-red-500" }
  return { text: "text-gray-400", bar: "bg-gray-300" }
}

function recommendationBadge(rec?: string) {
  if (!rec) return null
  const map: Record<string, string> = {
    "Strong Hire": "bg-emerald-600 text-white border-emerald-700",
    "Hire": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Maybe": "bg-amber-50 text-amber-700 border-amber-200",
    "Reject": "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <Badge className={`${map[rec] ?? "bg-gray-50 text-gray-700 border-gray-200"} border px-3 py-1 text-sm font-semibold`}>
      {rec}
    </Badge>
  )
}

interface Props {
  evaluation: InterviewEvaluation | string | null | undefined
  variant?: "initial" | "final"
}

export function EvaluationDisplay({ evaluation, variant = "initial" }: Props) {
  const parsed = tryParse(evaluation)

  if (!parsed) {
    if (evaluation && typeof evaluation === "string") {
      return (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{evaluation}</p>
        </div>
      )
    }
    return null
  }

  const categoryScores = parsed.category_scores ?? {}
  const overall = parsed.overall_score

  return (
    <div className="space-y-5">
      {(typeof overall === "number" || parsed.recommendation) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4">
          {typeof overall === "number" && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {variant === "final" ? "Final Score" : "Overall Score"}
              </p>
              <p className={`text-4xl font-bold ${scoreTone(overall).text}`}>
                {overall}
                <span className="text-lg text-gray-400 font-medium">/100</span>
              </p>
            </div>
          )}
          {parsed.recommendation && (
            <div className="text-center sm:text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Recommendation
              </p>
              {recommendationBadge(parsed.recommendation)}
            </div>
          )}
        </div>
      )}

      {parsed.summary && (
        <div className="rounded-lg bg-[#1282A2]/5 border border-[#1282A2]/20 p-4">
          <p className="text-xs font-semibold text-[#1282A2] uppercase tracking-wide mb-2">
            Summary
          </p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {parsed.summary}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Category Scores
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {INTERVIEW_QUESTION_CATEGORIES.map((category: InterviewQuestionCategory) => {
            const entry = categoryScores[category]
            const score = typeof entry?.score === "number" ? entry.score : 0
            const notAssessed = !entry || score === 0
            const tone = scoreTone(score)
            return (
              <div key={category} className={`px-4 py-3 ${notAssessed ? "bg-gray-50/50" : "bg-white"}`}>
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <p className={`text-sm font-semibold ${notAssessed ? "text-gray-400" : "text-[#0A1128]"}`}>
                    {category}
                  </p>
                  <span className={`text-sm font-bold tabular-nums ${tone.text}`}>
                    {notAssessed ? "—" : `${score}/100`}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${tone.bar} h-full rounded-full transition-all`}
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
                {entry?.comment && (
                  <p className={`text-xs mt-2 leading-relaxed ${notAssessed ? "italic text-gray-400" : "text-gray-600"}`}>
                    {entry.comment}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {(parsed.strengths?.length || parsed.weaknesses?.length) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {parsed.strengths && parsed.strengths.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Strengths
                </p>
              </div>
              <ul className="space-y-1.5">
                {parsed.strengths.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-emerald-500 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsed.weaknesses && parsed.weaknesses.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                  Weaknesses
                </p>
              </div>
              <ul className="space-y-1.5">
                {parsed.weaknesses.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {parsed.rationale && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#034078]" />
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Rationale
            </p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {parsed.rationale}
          </p>
        </div>
      )}

      {variant === "final" && (parsed.score_adjustment_reason || parsed.hr_alignment || parsed.hr_insights) && (
        <div className="rounded-lg border border-[#034078]/20 bg-[#034078]/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MinusCircle className="w-4 h-4 text-[#034078]" />
            <p className="text-xs font-semibold text-[#034078] uppercase tracking-wide">
              HR Alignment Details
            </p>
          </div>
          {parsed.score_adjustment_reason && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Score Adjustment Reason</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.score_adjustment_reason}</p>
            </div>
          )}
          {parsed.hr_alignment && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">HR Alignment</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.hr_alignment}</p>
            </div>
          )}
          {parsed.hr_insights && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">HR Insights</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.hr_insights}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
