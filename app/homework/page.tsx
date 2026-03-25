import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import HomeworkBoard from './HomeworkBoard'
import HomeworkFeed from './HomeworkFeed'

export default async function HomeworkPage() {
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
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: completions } = await supabase
      .from('assignment_completions')
      .select('assignment_id, student_id')

    const { data: students } = await supabase
      .from('students')
      .select('id, class_num')

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <HomeworkBoard
              assignments={assignments ?? []}
              completions={completions ?? []}
              students={students ?? []}
              createdBy={user.id}
            />
          </main>
        </div>
      </div>
    )
  }

  // Student view — matched by email (no user_id column in students)
  const { data: student } = await supabase
    .from('students')
    .select('id, class_num, stage')
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

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('class_num', student.class_num)
    .order('due_date', { ascending: true })

  const { data: completions } = await supabase
    .from('assignment_completions')
    .select('assignment_id, completed_at')
    .eq('student_id', student.id)

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student.class_num}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <HomeworkFeed
            assignments={assignments ?? []}
            completions={completions ?? []}
            studentId={student.id}
          />
        </main>
      </div>
    </div>
  )
}
