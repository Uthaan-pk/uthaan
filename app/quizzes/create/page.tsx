import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizCreateForm from './QuizCreateForm'
import { CURRENT_TERM } from '@/lib/constants'
import { resolveEffectiveRole } from '@/lib/school'

type TimetableRow = {
  subject: string | null
}

export default async function CreateQuizPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const isTeacher = effectiveRole === 'teacher'

  if (!isTeacher) redirect('/quizzes')

  const { data: timetableRows } = await supabase
    .from('timetable')
    .select('subject')
    .eq('teacher_id', user.id)
    .limit(500)

  const visibleSubjects = Array.from(
    new Set(
      (timetableRows ?? [])
        .map((row: TimetableRow) => row.subject?.toLowerCase?.())
        .filter(Boolean)
    )
  )

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={effectiveRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Create quiz</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {CURRENT_TERM}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <QuizCreateForm
              userId={user.id}
              schoolId={roleData?.school_id ?? null}
              visibleSubjects={visibleSubjects}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
