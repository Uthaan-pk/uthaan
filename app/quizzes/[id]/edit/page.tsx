import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizCreateForm from '../../create/QuizCreateForm'

type DBQuestion = {
  text: string
  options: { A: string; B: string; C: string; D: string }
  correct: string
}

const optionLabels = ['A', 'B', 'C', 'D']

export default async function EditQuizPage({
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

  if (!isStaff) redirect('/dashboard')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single()

  if (!quiz) redirect('/quizzes')

  const questions = Array.isArray(quiz.questions)
    ? (quiz.questions as DBQuestion[]).map((q) => ({
        text: q.text,
        options: [q.options.A, q.options.B, q.options.C, q.options.D] as [string, string, string, string],
        correct: optionLabels.indexOf(q.correct),
      }))
    : []

  const initialData = {
    title: quiz.title ?? '',
    subject: quiz.subject ?? '',
    timeLimit: String(quiz.time_limit ?? 30),
    status: (quiz.status ?? 'draft') as 'active' | 'inactive' | 'draft',
    questions,
  }

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
            <h1 className="text-sm font-semibold text-gray-900">Edit quiz</h1>
          </div>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <QuizCreateForm userId={user.id} quizId={id} initialData={initialData} />
          </div>
        </main>
      </div>
    </div>
  )
}
