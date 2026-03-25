import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizAttemptManager from './QuizAttemptManager'
import QuizStaffView from './QuizStaffView'

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

  const questions: Question[] = Array.isArray(quiz.questions)
    ? (quiz.questions as DBQuestion[]).map(normalizeQuestion)
    : []

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
            <QuizStaffView quiz={quiz} questions={questions} />
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

  // Count how many attempts this student has already used
  const { data: submissions } = await supabase
    .from('quiz_submissions')
    .select('id')
    .eq('quiz_id', id)
    .eq('user_id', user.id)

  const submissionCount = submissions?.length ?? 0
  const maxAttempts = quiz.max_attempts ?? 1

  // All attempts exhausted
  if (submissionCount >= maxAttempts) {
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
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">You have used all your attempts for this quiz.</div>
              <div className="text-xs text-gray-400 mb-4">
                {maxAttempts} of {maxAttempts} attempt{maxAttempts !== 1 ? 's' : ''} used.
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

  // Guard: quiz has no questions
  if (questions.length === 0) {
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
              <div className="text-sm text-gray-500 mb-4">This quiz has no questions yet.</div>
              <Link href="/quizzes" className="text-xs text-[#1a2e1a] underline underline-offset-2">
                ← Back to quizzes
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Render quiz taker
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
