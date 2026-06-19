"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import {
  INTERVIEW_QUESTION_CATEGORIES,
  type CategorizedQuestion,
  type InterviewQuestionCategory,
} from "@/lib/recruitment/types"

const CATEGORY_ACCENTS: Record<InterviewQuestionCategory, string> = {
  "Technical / Functional Skills": "bg-[#034078]/10 text-[#034078] border-[#034078]/30",
  "Behavioral": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Situational / Hypothetical": "bg-amber-50 text-amber-700 border-amber-200",
  "Problem-Solving / Analytical": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Communication Skills": "bg-sky-50 text-sky-700 border-sky-200",
  "Cultural Fit": "bg-pink-50 text-pink-700 border-pink-200",
  "Experience Deep Dive": "bg-[#1282A2]/10 text-[#1282A2] border-[#1282A2]/30",
  "Role-Specific Scenarios": "bg-violet-50 text-violet-700 border-violet-200",
  "Adaptability & Learning": "bg-teal-50 text-teal-700 border-teal-200",
  "Leadership / Ownership": "bg-rose-50 text-rose-700 border-rose-200",
}

interface Props {
  questions: CategorizedQuestion[]
  onChange: (next: CategorizedQuestion[]) => void
}

export function CategorizedQuestionsEditor({ questions, onChange }: Props) {
  const countsByCategory = questions.reduce<Record<string, number>>((acc, q) => {
    if (q.category) acc[q.category] = (acc[q.category] || 0) + 1
    return acc
  }, {})

  const updateAt = (index: number, patch: Partial<CategorizedQuestion>) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q))
    onChange(next)
  }

  const removeAt = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  const addQuestion = (category?: InterviewQuestionCategory) => {
    const next: CategorizedQuestion = {
      category: category ?? INTERVIEW_QUESTION_CATEGORIES[0],
      question: "",
    }
    onChange([...questions, next])
  }

  return (
    <div className="space-y-4">
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <span className="text-xs font-semibold text-gray-600 self-center mr-1">
            {questions.length} {questions.length === 1 ? "question" : "questions"}:
          </span>
          {Object.entries(countsByCategory).map(([category, count]) => (
            <Badge
              key={category}
              variant="outline"
              className={`${CATEGORY_ACCENTS[category as InterviewQuestionCategory] ?? ""} text-[11px]`}
            >
              {category} · {count}
            </Badge>
          ))}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-4 py-8 text-center">
          <p className="text-sm text-gray-600">
            No questions yet. Add at least one question per category you want the AI to cover.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1.5 w-6 h-6 rounded-full bg-[#034078]/10 text-[#034078] text-xs font-semibold flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="text-xs text-gray-500 sm:w-20 flex-shrink-0">
                      Category
                    </Label>
                    <Select
                      value={q.category}
                      onValueChange={(value) =>
                        updateAt(index, { category: value as InterviewQuestionCategory })
                      }
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVIEW_QUESTION_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateAt(index, { question: e.target.value })}
                    placeholder="Type the question the AI should ask..."
                    className="min-h-[72px]"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAt(index)}
                  aria-label="Remove question"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => addQuestion()}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
        <p className="text-[11px] text-gray-500 text-center">
          Quick add by category:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INTERVIEW_QUESTION_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => addQuestion(category)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors hover:opacity-80 ${CATEGORY_ACCENTS[category]}`}
            >
              + {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
