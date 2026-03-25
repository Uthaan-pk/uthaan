'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type Submission = {
  id: string
  user_id: string
  answers: (number | null)[]
  score: number
  submitted_at: string
}

const optionLabels = ['A', 'B', 'C', 'D']

function shortId(uid: string) {
  return uid.replace(/-/g, '').slice(0, 8)
}

export default function QuizResults({
  quizId,
  questions,
}: {
  quizId: string
  questions: Question[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [roleMap, setRoleMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: subs } = await supabase
        .from('quiz_submissions')
        .select('id, user_id, answers, score, submitted_at')
        .eq('quiz_id', quizId)
        .order('submitted_at', { ascending: false })

      if (!subs || subs.length === 0) {
        setLoading(false)
        return
      }

      const userIds = [...new Set(subs.map((s: Submission) => s.user_id))]
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)

      const map: Record<string, string> = {}
      roles?.forEach((r: { user_id: string; role: string }) => {
        map[r.user_id] = r.role
      })

      setSubmissions(subs)
      setRoleMap(map)
      setLoading(false)
    }
    load()
  }, [quizId, supabase])

  const total = questions.length

  // ── Derived stats ─────────────────────────────────────────────────────────
  const scores = submissions.map((s) => (total > 0 ? Math.round((s.score / total) * 100) : 0))
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const highest = scores.length > 0 ? Math.max(...scores) : 0
  const lowest = scores.length > 0 ? Math.min(...scores) : 0

  // ── Per-question analysis ─────────────────────────────────────────────────
  const questionStats = useMemo(() => {
    return questions.map((q, qIndex) => {
      const optionCounts = [0, 0, 0, 0]
      let unanswered = 0

      submissions.forEach((s) => {
        const ans = Array.isArray(s.answers) ? s.answers[qIndex] : null
        if (ans === null || ans === undefined) {
          unanswered++
        } else {
          optionCounts[ans] = (optionCounts[ans] || 0) + 1
        }
      })

      const totalAnswered = submissions.length - unanswered
      const correctCount = optionCounts[q.correct] || 0
      const correctPct = totalAnswered > 0 ? Math.round((correctCount / submissions.length) * 100) : 0

      // Most chosen wrong answer
      let mostWrongIndex = -1
      let mostWrongCount = 0
      optionCounts.forEach((count, i) => {
        if (i !== q.correct && count > mostWrongCount) {
          mostWrongCount = count
          mostWrongIndex = i
        }
      })

      return { optionCounts, correctCount, correctPct, mostWrongIndex, mostWrongCount, unanswered }
    })
  }, [questions, submissions])

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">Loading results…</div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
        No submissions yet
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Summary row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students attempted', value: submissions.length },
          { label: 'Average score', value: `${avg}%` },
          { label: 'Highest score', value: `${highest}%` },
          { label: 'Lowest score', value: `${lowest}%` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Student table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Student submissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Identifier</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Role</th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Score</th>
                <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Pct</th>
                <th className="text-center px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Result</th>
                <th className="text-right px-5 py-2.5 text-[10px] uppercase tracking-wide text-gray-400 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.map((s) => {
                const pct = total > 0 ? Math.round((s.score / total) * 100) : 0
                const passed = pct >= 60
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-gray-700">{shortId(s.user_id)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{roleMap[s.user_id] ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.score} / {total}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{pct}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block font-semibold px-2.5 py-0.5 rounded-full text-[10px] ${
                        passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                      }`}>
                        {passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {new Date(s.submitted_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Question analysis ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Question analysis</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.map((q, i) => {
            const stat = questionStats[i]
            const { correctPct, mostWrongIndex, mostWrongCount } = stat

            const bandColor =
              correctPct >= 70
                ? 'border-l-green-400 bg-green-50/30'
                : correctPct >= 40
                ? 'border-l-amber-400 bg-amber-50/20'
                : 'border-l-red-400 bg-red-50/20'

            const pctColor =
              correctPct >= 70
                ? 'text-green-700'
                : correctPct >= 40
                ? 'text-amber-700'
                : 'text-red-700'

            return (
              <div key={i} className={`px-5 py-4 border-l-4 ${bandColor}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-2">
                      Q{i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{q.text}</span>
                  </div>
                  <div className={`shrink-0 text-sm font-bold ${pctColor}`}>
                    {correctPct}% correct
                  </div>
                </div>

                {/* Option breakdown */}
                <div className="space-y-1 mt-3">
                  {q.options.map((opt, optIdx) => {
                    const count = stat.optionCounts[optIdx] || 0
                    const isCorrect = optIdx === q.correct
                    const isMostWrong = optIdx === mostWrongIndex && mostWrongCount > 0
                    const barPct = submissions.length > 0
                      ? Math.round((count / submissions.length) * 100)
                      : 0

                    return (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {optionLabels[optIdx]}
                        </span>
                        <span className={`text-xs truncate w-40 ${isCorrect ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                          {opt}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCorrect ? 'bg-green-400' : isMostWrong ? 'bg-red-300' : 'bg-gray-300'}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 w-12 text-right">
                          {count} ({barPct}%)
                        </span>
                        {isMostWrong && (
                          <span className="text-[10px] text-red-500 font-medium">most wrong</span>
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
