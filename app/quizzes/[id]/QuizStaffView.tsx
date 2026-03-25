'use client'

import { useState } from 'react'
import QuizResults from './QuizResults'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type Quiz = {
  id: string
  title: string
  subject: string
  status: string
  time_limit_minutes: number
  created_at: string
}

const optionLabels = ['A', 'B', 'C', 'D']

function statusBadgeClass(status: string) {
  if (status === 'active') return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-800'
  if (status === 'closed') return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800'
  return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600'
}

type Tab = 'questions' | 'results'

export default function QuizStaffView({
  quiz,
  questions,
}: {
  quiz: Quiz
  questions: Question[]
}) {
  const [tab, setTab] = useState<Tab>('questions')

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── Quiz info card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">{quiz.title}</h2>
          <span className={statusBadgeClass(quiz.status)}>
            {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400">Subject: </span>{quiz.subject || '—'}
          </div>
          <div className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400">Time limit: </span>{quiz.time_limit_minutes} min
          </div>
          <div className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400">Questions: </span>{questions.length}
          </div>
          <div className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg">
            <span className="text-gray-400">Created: </span>
            {new Date(quiz.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Tab toggle ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('questions')}
          className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === 'questions'
              ? 'bg-[#1a2e1a] text-[#6fcf6f]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setTab('results')}
          className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === 'results'
              ? 'bg-[#1a2e1a] text-[#6fcf6f]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Results
        </button>
      </div>

      {/* ── Questions view ─────────────────────────────────────────────── */}
      {tab === 'questions' && questions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Questions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="px-5 py-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Question {qIndex + 1}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-3">{q.text}</div>
                <div className="space-y-1.5">
                  {q.options.map((opt, optIndex) => (
                    <div
                      key={optIndex}
                      className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                        q.correct === optIndex
                          ? 'bg-green-50 text-green-800'
                          : 'text-gray-500'
                      }`}
                    >
                      <span className="font-semibold w-4 flex-shrink-0">
                        {optionLabels[optIndex]}
                      </span>
                      <span>{opt}</span>
                      {q.correct === optIndex && (
                        <span className="ml-auto text-green-600 font-medium">Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results view ───────────────────────────────────────────────── */}
      {tab === 'results' && (
        <QuizResults quizId={quiz.id} questions={questions} />
      )}
    </div>
  )
}
