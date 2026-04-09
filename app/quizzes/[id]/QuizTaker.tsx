'use client'

import { useState, useEffect, useRef } from 'react'
import { submitQuiz } from './actions'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type Quiz = {
  id: string
  title: string
  subject: string
  time_limit: number
  questions: Question[]
}

const optionLabels = ['A', 'B', 'C', 'D']

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function QuizTaker({
  quiz,
  userId: _userId, // server action reads user from session; prop kept for API compat
  attemptNumber,
  maxAttempts,
}: {
  quiz: Quiz
  userId: string
  attemptNumber: number
  maxAttempts: number
  onRetry: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const answersRef = useRef<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const hasSubmittedRef = useRef(false)

  async function doSubmit(finalAnswers: (number | null)[]) {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true

    setSubmitting(true)
    setSubmitError(null)

    const calculatedScore = quiz.questions.reduce(
      (acc, q, i) => acc + (finalAnswers[i] === q.correct ? 1 : 0),
      0
    )

    const result = await submitQuiz(quiz.id, finalAnswers, calculatedScore)

    // Successful submissions and attempt-limit hits redirect server-side.
    hasSubmittedRef.current = false
    setSubmitting(false)
    setSubmitError(result.error ?? 'Could not submit quiz. Please try again.')
  }

  function autoSubmit() {
    doSubmit(answersRef.current)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          autoSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNext() {
    const newAnswers = [...answersRef.current]
    newAnswers[current] = selected
    answersRef.current = newAnswers

    if (current === quiz.questions.length - 1) {
      doSubmit(newAnswers)
    } else {
      setCurrent(current + 1)
      setSelected(null)
    }
  }

  const isLast = current === quiz.questions.length - 1
  const total = quiz.questions.length
  const progressPct = total > 0 ? ((current) / total) * 100 : 0

  const timerColor =
    timeLeft <= 30
      ? 'text-red-600'
      : timeLeft <= 60
      ? 'text-amber-600'
      : 'text-gray-600'

  // Guard: no questions
  if (quiz.questions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <div className="text-sm text-gray-500">This quiz has no questions.</div>
      </div>
    )
  }

  // Submitting overlay
  if (submitting) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 flex flex-col items-center justify-center gap-3">
        <div className="text-sm font-medium text-gray-700">Submitting your answers...</div>
        <div className="text-xs text-gray-400">Please wait</div>
      </div>
    )
  }

  const question = quiz.questions[current]

  return (
    <div className="space-y-4">
      {submitError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
          {submitError}
        </div>
      )}

      {/* Attempt indicator */}
      {maxAttempts > 1 && (
        <div className="text-xs text-gray-400 text-right">
          Attempt {attemptNumber} of {maxAttempts}
        </div>
      )}

      {/* Progress bar + timer */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500">
            Question {current + 1} of {total}
          </span>
          <span className={`text-xs font-semibold tabular-nums ${timerColor}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#6fcf6f] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.text}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((opt, optIndex) => {
          const isSelected = selected === optIndex
          return (
            <button
              key={optIndex}
              type="button"
              onClick={() => setSelected(optIndex)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                isSelected
                  ? 'border-[#6fcf6f] bg-[#6fcf6f]/10 text-gray-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-semibold transition-colors ${
                isSelected
                  ? 'border-[#6fcf6f] bg-[#6fcf6f] text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {optionLabels[optIndex]}
              </span>
              <span>{opt}</span>
            </button>
          )
        })}
      </div>

      {/* Next / Submit button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleNext}
          disabled={selected === null}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLast ? 'Submit quiz' : 'Next question'}
        </button>
      </div>
    </div>
  )
}
