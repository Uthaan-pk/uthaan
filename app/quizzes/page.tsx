import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizList from './QuizList'

export default async function QuizzesPage() {
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

  if (isStaff) {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, subject, time_limit_minutes, questions, status, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              <QuizList quizzes={quizzes ?? []} />
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Student view
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, subject, time_limit_minutes, questions, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const quizIds = (quizzes ?? []).map((q) => q.id)

  let submittedQuizIds: string[] = []
  if (quizIds.length > 0) {
    const { data: submissions } = await supabase
      .from('quiz_submissions')
      .select('quiz_id')
      .eq('user_id', user.id)
      .in('quiz_id', quizIds)
    submittedQuizIds = (submissions ?? []).map((s) => s.quiz_id)
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Available quizzes</h2>
              </div>

              {quizzes && quizzes.length > 0 ? quizzes.map((quiz) => {
                const submitted = submittedQuizIds.includes(quiz.id)
                const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0

                return (
                  <div key={quiz.id} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{quiz.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {quiz.subject} · {quiz.time_limit_minutes} min · {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {submitted ? (
                        <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600">
                          Submitted
                        </span>
                      ) : (
                        <Link
                          href={`/quizzes/${quiz.id}`}
                          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Take quiz
                        </Link>
                      )}
                    </div>
                  </div>
                )
              }) : (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  No active quizzes at the moment.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
