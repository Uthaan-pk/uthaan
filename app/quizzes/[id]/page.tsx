import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizTaker from './QuizTaker'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-800'
  if (status === 'closed') return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800'
  return 'text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600'
}

const optionLabels = ['A', 'B', 'C', 'D']

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()

  if (!quiz) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quiz not found</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-4">This quiz does not exist.</div>
              <Link
                href="/quizzes"
                className="text-xs text-[#1a2e1a] underline underline-offset-2"
              >
                ← Back to quizzes
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const questions: Question[] = Array.isArray(quiz.questions) ? quiz.questions : []

  if (isStaff) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Link
                href="/quizzes"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Quizzes
              </Link>
              <span className="text-gray-200">/</span>
              <h1 className="text-sm font-semibold text-gray-900 truncate">{quiz.title}</h1>
            </div>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl space-y-6">
              {/* Quiz info card */}
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

              {/* Questions list */}
              {questions.length > 0 && (
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
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Student view
  if (quiz.status !== 'active') {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">{quiz.title}</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-4">This quiz is not currently available.</div>
              <Link
                href="/quizzes"
                className="text-xs text-[#1a2e1a] underline underline-offset-2"
              >
                ← Back to quizzes
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Check if student already submitted
  const { data: submission } = await supabase
    .from('quiz_submissions')
    .select('score, answers')
    .eq('quiz_id', id)
    .eq('user_id', user.id)
    .single()

  if (submission) {
    const answers: (number | null)[] = Array.isArray(submission.answers) ? submission.answers : []
    const total = questions.length
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0)
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed = pct >= 50

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Link
                href="/quizzes"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Quizzes
              </Link>
              <span className="text-gray-200">/</span>
              <h1 className="text-sm font-semibold text-gray-900 truncate">{quiz.title}</h1>
            </div>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-6">
              {/* Score card */}
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                <div className={`text-4xl font-bold mb-1 ${passed ? 'text-green-600' : 'text-red-500'}`}>
                  {pct}%
                </div>
                <div className="text-sm text-gray-500 mb-2">{correct} of {total} correct</div>
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
                  {questions.map((q, qIndex) => {
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
          </main>
        </div>
      </div>
    )
  }

  // Not submitted: render quiz taker
  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">{quiz.title}</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <QuizTaker
              quiz={{
                id: quiz.id,
                title: quiz.title,
                subject: quiz.subject,
                time_limit_minutes: quiz.time_limit_minutes,
                questions: questions,
              }}
              userId={user.id}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
