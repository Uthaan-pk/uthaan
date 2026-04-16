import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AssignmentsBoard from './AssignmentsBoard'
import { CURRENT_TERM } from '@/lib/constants'
import AssignmentsFeed from './AssignmentsFeed'
import { resolveEffectiveRole } from '@/lib/school'

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const { open: initialOpenId = null } = await searchParams
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

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const isTeacher = effectiveRole === 'teacher'
  const isStaff = isTeacher

  if (isStaff) {
    const timetableQuery = isTeacher
      ? supabase
          .from('timetable')
          .select('class_num, subject')
          .eq('teacher_id', user.id)
          .limit(500)
      : supabase
          .from('timetable')
          .select('class_num, subject')
          .limit(2000)

    const [assignmentsRes, submissionsRes, studentsRes, timetableRes] =
      await Promise.all([
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
            'id, assignment_id, student_id, file_url, text_response, submitted_at, reviewed, reviewed_at, teacher_note, grade, score_percent, category'
          )
          .limit(2000),

        supabase
          .from('students')
          .select('id, name, class_num, roll_no')
          .eq('is_active', true)
          .order('name')
          .limit(500),

        timetableQuery,
      ])

    const timetableRows = timetableRes.data ?? []

    const visibleClassNums = isTeacher
      ? Array.from(
          new Set(
            timetableRows
              .map((row: any) => Number(row.class_num))
              .filter((n: number) => !isNaN(n) && n > 0)
          )
        ).sort((a, b) => a - b)
      : Array.from(
          new Set(
            (studentsRes.data ?? [])
              .map((s: any) => Number(s.class_num))
              .filter((n: number) => !isNaN(n) && n > 0)
          )
        ).sort((a, b) => a - b)

    const visibleSubjects = isTeacher
      ? Array.from(
          new Set(
            timetableRows
              .map((row: any) => (row.subject as string)?.toLowerCase?.())
              .filter(Boolean)
          )
        )
      : []

    const assignments = (assignmentsRes.data ?? []).filter((a: any) => {
      const classOk = visibleClassNums.includes(Number(a.class_num))
      if (!classOk) return false

      if (!isTeacher) return true
      return visibleSubjects.includes((a.subject ?? '').toLowerCase())
    })

    const students = (studentsRes.data ?? []).filter((s: any) =>
      visibleClassNums.includes(Number(s.class_num))
    )

    const assignmentIdSet = new Set(assignments.map((a: any) => a.id))

    const submissions = (submissionsRes.data ?? []).filter((s: any) =>
      assignmentIdSet.has(s.assignment_id)
    )

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar
          email={user.email!}
          role={effectiveRole}
          isImpersonating={role === 'superadmin'}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              Assignments
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="uthaan-page-content">
            <AssignmentsBoard
              assignments={assignments}
              submissions={submissions}
              students={students}
              currentUserId={user.id}
              role={effectiveRole}
              initialOpenId={initialOpenId}
              visibleSubjects={visibleSubjects}
            />
          </main>
        </div>
      </div>
    )
  }

  if (effectiveRole === 'admin') {
    redirect('/dashboard')
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
      .eq('is_active', true)
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
            <h1 className="text-sm font-semibold text-gray-900">
              Assignments
            </h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>

          <main className="uthaan-page-content">
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
        <Sidebar email={user.email!} role={role} />
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
    .eq('is_active', true)
    .single()

  if (!student) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Student not found
            </div>
            <div className="text-xs text-gray-400">
              Contact your administrator.
            </div>
          </div>
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
      .eq('class_num', student.class_num)
      .order('due_date', { ascending: true })
      .limit(200),

    supabase
      .from('assignment_submissions')
      .select(
        'id, assignment_id, submitted_at, reviewed, grade, text_response, file_url'
      )
      .eq('student_id', studentId)
      .limit(200),
  ])

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Assignments</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student.class_num}
          </span>
        </header>

        <main className="uthaan-page-content">
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
