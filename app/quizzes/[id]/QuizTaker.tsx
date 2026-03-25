'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function QuizTaker({ quiz, userId }: { quiz: Quiz; userId: string }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const answersRef = useRef<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const hasSubmittedRef = useRef(false)

  const supabase = useMemo(() => createClient(), [])
  const supabaseRef = useRef(supabase)

  async function doSubmit(finalAnswers: (number | null)[]) {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true

    setSubmitting(true)

    const calculatedScore = quiz.questions.reduce(
      (acc, q, i) => acc + (finalAnswers[i] === q.correct ? 1 : 0),
      0
    )

    await supabaseRef.current.from('quiz_submissions').insert({
      quiz_id: quiz.id,
      user_id: userId,
      answers: finalAnswers,
      score: calculatedScore,
    })

    setScore(calculatedScore)
    setAnswers(finalAnswers)
    setSubmitting(false)
    setSubmitted(true)
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
    setAnswers(newAnswers)

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

  // Post-submit view
  if (submitted) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = pct >= 50

    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <div className={`text-4xl font-bold mb-1 ${passed ? 'text-green-600' : 'text-red-500'}`}>
            {pct}%
          </div>
          <div className="text-sm text-gray-500 mb-2">{score} of {total} correct</div>
          <div className={`text-xs font-medium px-3 py-1 rounded-full inline-block ${
            passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}>
            {passed ? 'Passed' : 'Not passed'}
          </div>
        </div>

        {/* Review */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Review</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {quiz.questions.map((q, qIndex) => {
              const studentAnswer = answers[qIndex] ?? null
              const isCorrect = studentAnswer === q.correct

              return (
                <div key={qIndex} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">Q{qIndex + 1}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-3">{q.text}</div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIndex) => {
                      const isCorrectOpt = q.correct === optIndex
                      const isStudentWrongChoice = studentAnswer === optIndex && !isCorrectOpt

                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                            isCorrectOpt
                              ? 'bg-green-50 text-green-800'
                              : isStudentWrongChoice
                              ? 'bg-red-50 text-red-700'
                              : 'text-gray-500'
                          }`}
                        >
                          <span className="font-semibold w-4 flex-shrink-0">
                            {optionLabels[optIndex]}
                          </span>
                          <span>{opt}</span>
                          {isCorrectOpt && (
                            <span className="ml-auto font-medium text-green-600">✓ Correct</span>
                          )}
                          {isStudentWrongChoice && (
                            <span className="ml-auto font-medium text-red-600">✗ Your answer</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
