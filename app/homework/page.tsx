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

  // Parent view
  if (role === 'parent') {
    const { data: link } = await supabase
      .from('parent_student')
      .select('student_id')
      .eq('parent_id', user.id)
      .single()

    if (!link) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">No child linked to your account</div>
              <div className="text-xs text-gray-400">Contact the school administrator to link your child.</div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num')
      .eq('id', link.student_id)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">Student record not found</div>
              <div className="text-xs text-gray-400">Contact the school administrator.</div>
            </div>
          </div>
        </div>
      )
    }

    const [assignmentsRes, completionsRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, title, description, subject, class_num, due_date')
        .eq('class_num', child.class_num)
        .order('due_date', { ascending: true }),
      supabase
        .from('assignment_completions')
        .select('assignment_id')
        .eq('student_id', child.id),
    ])

    const assignments = assignmentsRes.data ?? []
    const doneIds = new Set((completionsRes.data ?? []).map(c => c.assignment_id))

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl space-y-2">
              {assignments.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-10 text-center text-sm text-gray-400">
                  No homework posted
                </div>
              ) : assignments.map(a => (
                <div
                  key={a.id}
                  className={`bg-white rounded-xl border p-4 ${doneIds.has(a.id) ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-100">
                          {a.subject.charAt(0).toUpperCase() + a.subject.slice(1)}
                        </span>
                        {doneIds.has(a.id) && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-100">
                            Done ✓
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-semibold ${doneIds.has(a.id) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {a.title}
                      </h3>
                      {a.description && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{a.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      Due {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
