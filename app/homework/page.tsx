import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import HomeworkBoard, { type Assignment } from './HomeworkBoard'
import { CURRENT_TERM } from '@/lib/constants'
import HomeworkFeed, { type Assignment as FeedAssignment } from './HomeworkFeed'

export default async function HomeworkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch role + student_id together — avoids a second round-trip for the student path
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  if (isStaff) {
    // All three queries are independent — run in parallel
    const [assignmentsRes, completionsRes, studentsRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, title, description, subject, class_num, due_date, created_by')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('assignment_completions')
        .select('assignment_id, student_id')
        .limit(2000),
      supabase
        .from('students')
        .select('id, class_num')
        .limit(500),
    ])

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>
          <main className="uthaan-page-content">
            <HomeworkBoard
              assignments={(assignmentsRes.data as unknown as Assignment[]) ?? []}
              completions={completionsRes.data ?? []}
              students={studentsRes.data ?? []}
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

    const [childRes, completionsRes] = await Promise.all([
      supabase.from('students').select('id, name, class_num').eq('id', link.student_id).single(),
      supabase.from('assignment_completions').select('assignment_id').eq('student_id', link.student_id).limit(200),
    ])

    const child = childRes.data

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

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, description, subject, class_num, due_date')
      .eq('class_num', child.class_num)
      .order('due_date', { ascending: true })
      .limit(200)

    const doneIds = new Set((completionsRes.data ?? []).map(c => c.assignment_id))

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>
          <main className="uthaan-page-content">
            <div className="max-w-2xl space-y-2">
              {assignments?.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-10 text-center text-sm text-gray-400">
                  No homework posted
                </div>
              ) : assignments?.map(a => (
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

  // Student view — student_id comes from the initial user_roles query, no second round-trip
  const studentId = roleData?.student_id

  if (!studentId) {
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

  // Fetch student record (for class_num) and completions in parallel
  const [studentRes, completionsRes] = await Promise.all([
    supabase.from('students').select('id, class_num').eq('id', studentId).single(),
    supabase.from('assignment_completions').select('assignment_id, completed_at').eq('student_id', studentId).limit(200),
  ])

  const student = studentRes.data

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
    .select('id, title, description, subject, class_num, due_date')
    .eq('class_num', student.class_num)
    .order('due_date', { ascending: true })
    .limit(200)

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Homework</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student.class_num}
          </span>
        </header>
        <main className="uthaan-page-content">
          <HomeworkFeed
            assignments={(assignments as unknown as FeedAssignment[]) ?? []}
            completions={completionsRes.data ?? []}
            studentId={student.id}
          />
        </main>
      </div>
    </div>
  )
}
