import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizAttemptManager from './QuizAttemptManager'
import QuizStaffView from './QuizStaffView'
import { CURRENT_TERM } from '@/lib/constants'
import { resolveEffectiveRole } from '@/lib/school'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type DBQuestion = {
  text: string
  options: { A: string; B: string; C: string; D: string }
  correct: string
}

const optionLabels = ['A', 'B', 'C', 'D']

function normalizeQuestion(q: DBQuestion): Question {
  const opts = q.options ?? { A: '', B: '', C: '', D: '' }
  return {
    text: q.text ?? '',
    options: [opts.A ?? '', opts.B ?? '', opts.C ?? '', opts.D ?? ''],
    correct: optionLabels.indexOf(q.correct),
  }
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const { mode } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const isTeacher = effectiveRole === 'teacher'
  const isStaff = isTeacher

  if (effectiveRole === 'admin') {
    redirect('/dashboard')
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()

  if (!quiz) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quiz not found</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
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

  if (isTeacher) {
    const { data: timetableRows } = await supabase
      .from('timetable')
      .select('class_num, subject')
      .eq('teacher_id', user.id)
      .limit(500)

    const visibleClassNums = Array.from(
      new Set(
        (timetableRows ?? [])
          .map((row: any) => Number(row.class_num))
          .filter((n: number) => !isNaN(n) && n > 0)
      )
    )

    const visibleSubjects = Array.from(
      new Set(
        (timetableRows ?? [])
          .map((row: any) => (row.subject as string)?.toLowerCase?.())
          .filter(Boolean)
      )
    )

    const subjectOk = visibleSubjects.includes((quiz.subject ?? '').toLowerCase())
    const classValue = quiz.class_num == null ? null : Number(quiz.class_num)
    const classOk =
      classValue == null || visibleClassNums.includes(classValue)

    if (!subjectOk || !classOk) {
      redirect('/quizzes')
    }
  }

  const questions: Question[] = Array.isArray(quiz.questions)
    ? (quiz.questions as DBQuestion[]).map(normalizeQuestion)
    : []

  if (isStaff) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar
          email={user.email!}
          role={effectiveRole}
          isImpersonating={role === 'superadmin'}
        />

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
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {quiz.title}
              </h1>
            </div>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <QuizStaffView quiz={quiz} questions={questions} />
          </main>
        </div>
      </div>
    )
  }

  if (quiz.status !== 'active') {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">{quiz.title}</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-4">
                This quiz is not currently available.
              </div>
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

  const { data: submissions } = await supabase
    .from('quiz_submissions')
    .select('id, score, submitted_at')
    .eq('quiz_id', id)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: true })

  const submissionCount = submissions?.length ?? 0
  const maxAttempts = quiz.max_attempts ?? 1

  if (mode === 'results' && submissionCount > 0) {
    const total = questions.length
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
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
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {quiz.title}
              </h1>
            </div>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                <div className="text-xs text-gray-500 mb-3">
                  {submissionCount} attempt{submissionCount !== 1 ? 's' : ''}{' '}
                  completed
                  {submissionCount < maxAttempts && (
                    <span className="ml-2 text-[#1a2e1a] font-medium">
                      · {maxAttempts - submissionCount} remaining
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {(submissions ?? []).map((sub, i) => {
                    const pct =
                      total > 0
                        ? Math.round(((sub.score ?? 0) / total) * 100)
                        : 0
                    const passed = pct >= 50
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm text-gray-700">
                          Attempt {i + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {new Date(sub.submitted_at).toLocaleDateString(
                              'en-GB',
                              { day: 'numeric', month: 'short' }
                            )}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              passed
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {pct}%
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {sub.score ?? 0}/{total}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {(submissions ?? []).length > 0 && total > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Best score</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round(
                        (Math.max(...(submissions ?? []).map(s => s.score ?? 0)) /
                          total) *
                          100
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
              <Link
                href="/quizzes"
                className="inline-block text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to quizzes
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">{quiz.title}</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-4">
                This quiz has no questions yet.
              </div>
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

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {quiz.title}
          </h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {CURRENT_TERM}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <QuizAttemptManager
              quiz={{
                id: quiz.id,
                title: quiz.title,
                subject: quiz.subject,
                time_limit: quiz.time_limit,
                questions,
              }}
              userId={user.id}
              initialAttemptNumber={submissionCount + 1}
              maxAttempts={maxAttempts}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
