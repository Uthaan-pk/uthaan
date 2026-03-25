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
      .select('id, title, subject, time_limit, questions, status, created_at')
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

  // Student view — look up student record by email (same pattern as homework)
  const { data: student } = await supabase
    .from('students')
    .select('id, class_num')
    .eq('email', user.email!)
    .single()

  if (!student) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">No student record found</div>
            <div className="text-xs text-gray-400">Your account is not linked to a student. Contact your administrator.</div>
          </div>
        </div>
      </div>
    )
  }

  // Fetch active quizzes assigned to this student's class or all classes
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, subject, time_limit, questions, status, created_at, max_attempts')
    .eq('status', 'active')
    .or(`class_num.eq.${student.class_num},class_num.is.null`)
    .order('created_at', { ascending: false })

  const quizIds = (quizzes ?? []).map((q) => q.id)

  // Count submissions per quiz_id to determine remaining attempts
  const submissionCounts: Record<string, number> = {}
  if (quizIds.length > 0) {
    const { data: submissions } = await supabase
      .from('quiz_submissions')
      .select('quiz_id')
      .eq('user_id', user.id)
      .in('quiz_id', quizIds)

    for (const s of (submissions ?? [])) {
      submissionCounts[s.quiz_id] = (submissionCounts[s.quiz_id] ?? 0) + 1
    }
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student.class_num}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Available quizzes</h2>
              </div>

              {quizzes && quizzes.length > 0 ? quizzes.map((quiz) => {
                const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0
                const subCount = submissionCounts[quiz.id] ?? 0
                const maxAtt = quiz.max_attempts ?? 1
                const fullyAttempted = subCount >= maxAtt

                return (
                  <div key={quiz.id} className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{quiz.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {quiz.subject} · {quiz.time_limit} min · {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {fullyAttempted ? (
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
