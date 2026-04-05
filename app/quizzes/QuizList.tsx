'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export type Quiz = {
  id: string
  title: string
  subject: string
  time_limit: number
  questions: any[]
  status: string
  created_at: string
}

function statusBadgeClass(status: string) {
  if (status === 'active') {
    return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-800'
  }
  if (status === 'closed') {
    return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800'
  }
  return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600'
}

export default function QuizList({
  quizzes: initialQuizzes,
  canManage,
}: {
  quizzes: Quiz[]
  canManage: boolean
}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes)
  const [toggling, setToggling] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  async function handleToggle(quiz: Quiz) {
    if (!canManage || toggling) return

    const newStatus = quiz.status === 'active' ? 'closed' : 'active'

    setToggling(quiz.id)
    setQuizzes(prev =>
      prev.map(q => (q.id === quiz.id ? { ...q, status: newStatus } : q))
    )

    const { error } = await supabase
      .from('quizzes')
      .update({ status: newStatus })
      .eq('id', quiz.id)

    if (error) {
      setQuizzes(prev =>
        prev.map(q => (q.id === quiz.id ? { ...q, status: quiz.status } : q))
      )
    }

    setToggling(null)
  }

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Link
            href="/quizzes/create"
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New quiz
          </Link>
        </div>
      )}

      {!canManage && (
        <div className="mb-4 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3">
          Admin view is read-only. Teachers are the only role allowed to create,
          edit, or change quiz status.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            {canManage ? 'Your quizzes' : 'All quizzes'}
          </h2>
        </div>

        {quizzes.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            {canManage ? 'No quizzes yet. Create your first quiz.' : 'No quizzes yet.'}
          </div>
        ) : (
          quizzes.map(quiz => {
            const questionCount = Array.isArray(quiz.questions)
              ? quiz.questions.length
              : 0
            const canToggle = canManage && (quiz.status === 'active' || quiz.status === 'closed')

            return (
              <div
                key={quiz.id}
                className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-[#1a2e1a] transition-colors"
                  >
                    {quiz.title}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {quiz.subject} · {quiz.time_limit} min · {questionCount}{' '}
                    question{questionCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={statusBadgeClass(quiz.status)}>
                    {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                  </span>

                  {canManage && (
                    <Link
                      href={`/quizzes/${quiz.id}/edit`}
                      className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md px-2 py-0.5 transition-colors"
                    >
                      Edit
                    </Link>
                  )}

                  {canToggle && (
                    <button
                      onClick={() => handleToggle(quiz)}
                      disabled={toggling === quiz.id}
                      className="text-[10px] font-medium border border-gray-200 rounded-md px-2 py-0.5 transition-colors text-gray-600 hover:text-gray-800 hover:border-gray-300 disabled:opacity-50"
                    >
                      {toggling === quiz.id
                        ? 'Saving…'
                        : quiz.status === 'active'
                          ? 'Close'
                          : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}