import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AssignmentsBoard from './AssignmentsBoard'
import AssignmentsFeed from './AssignmentsFeed'

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  if (isStaff) {
    const [assignmentsRes, submissionsRes, studentsRes] = await Promise.all([
      supabase
        .from('assignments')
        .select(
          'id, title, description, subject, class_num, due_date, created_by, created_at, attachment_url, attachment_name'
        )
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('assignment_submissions')
        .select(
          'id, assignment_id, student_id, file_url, text_response, submitted_at, reviewed, reviewed_at, teacher_note, grade'
        )
        .limit(2000),
      supabase
        .from('students')
        .select('id, name, class_num, roll_no')
        .order('name')
        .limit(500),
    ])

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Assignments</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <AssignmentsBoard
              assignments={assignmentsRes.data ?? []}
              submissions={submissionsRes.data ?? []}
              students={studentsRes.data ?? []}
              currentUserId={user.id}
              role={role ?? ''}
            />
          </main>
        </div>
      </div>
    )
  }

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
              <div className="text-sm text-gray-400">
                No child linked. Contact administrator.
              </div>
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
            <div className="text-sm text-gray-400">Student not found.</div>
          </div>
        </div>
      )
    }

    const [assignmentsRes, submissionsRes] = await Promise.all([
      supabase
        .from('assignments')
        .select(
          'id, title, description, subject, class_num, due_date, attachment_url, attachment_name'
        )
        .eq('class_num', child.class_num)
        .order('due_date', { ascending: true })
        .limit(200),
      supabase
        .from('assignment_submissions')
        .select('id, assignment_id, submitted_at, reviewed, grade')
        .eq('student_id', child.id)
        .limit(200),
    ])

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Assignments</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <AssignmentsFeed
              assignments={assignmentsRes.data ?? []}
              submissions={submissionsRes.data ?? []}
              studentId={child.id}
              readOnly={true}
            />
          </main>
        </div>
      </div>
    )
  }

  const studentId = roleData?.student_id

  if (!studentId) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Account not linked
            </div>
            <div className="text-xs text-gray-400">
              Contact your administrator.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: student } = await supabase
    .from('students')
    .select('id, class_num')
    .eq('id', studentId)
    .single()

  const [assignmentsRes, submissionsRes] = await Promise.all([
    supabase
      .from('assignments')
      .select(
        'id, title, description, subject, class_num, due_date, attachment_url, attachment_name'
      )
      .eq('class_num', student?.class_num ?? 0)
      .order('due_date', { ascending: true })
      .limit(200),
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, submitted_at, reviewed, grade, text_response, file_url')
      .eq('student_id', studentId)
      .limit(200),
  ])

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Assignments</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student?.class_num}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AssignmentsFeed
            assignments={assignmentsRes.data ?? []}
            submissions={submissionsRes.data ?? []}
            studentId={studentId}
            readOnly={false}
          />
        </main>
      </div>
    </div>
  )
}