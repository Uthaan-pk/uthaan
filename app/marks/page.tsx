import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import GradebookGrid from './GradebookGrid'
import ClassGradebookShell from './ClassGradebookShell'
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/constants'
import { buildAllMarksData } from '@/lib/gradeUtils'

export default async function MarksPage() {
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
  const isStaff = role === 'teacher' || role === 'admin'

  // ── Admin / Teacher ────────────────────────────────────────────────────────
  if (isStaff) {
    const [
      studentsRes,
      marksRes,
      assignmentsRes,
      submissionsRes,
      weightsRes,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, roll_no, class_num, is_active, user_id')
        .eq('is_active', true)
        .order('name')
        .limit(500),
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .limit(5000),
      supabase
        .from('assignments')
        .select('id, title, subject, class_num, due_date, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, grade, submitted_at, reviewed')
        .limit(5000),
      supabase
        .from('grade_weights')
        .select(
          'id, class_num, subject, assignment_weight, exam_weight, final_weight, quiz_weight'
        )
        .eq('academic_year', CURRENT_YEAR)
        .limit(500),
    ])

    const flatMarks = marksRes.data ?? []
    const allMarks  = buildAllMarksData(flatMarks)

    // Compute assignment average per student from graded submissions
    const assignmentAvgByStudentId: Record<string, number> = {}
    const byStudent: Record<string, number[]> = {}
    for (const sub of submissionsRes.data ?? []) {
      if (!sub.grade) continue
      const g = parseFloat(sub.grade)
      if (isNaN(g)) continue
      if (!byStudent[sub.student_id]) byStudent[sub.student_id] = []
      byStudent[sub.student_id].push(g)
    }
    for (const [sid, grades] of Object.entries(byStudent)) {
      assignmentAvgByStudentId[sid] = grades.reduce((a, b) => a + b, 0) / grades.length
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ClassGradebookShell
              allStudents={studentsRes.data ?? []}
              allMarks={allMarks}
              flatMarks={flatMarks}
              assignments={assignmentsRes.data ?? []}
              submissions={submissionsRes.data ?? []}
              weightRows={weightsRes.data ?? []}
              quizAvgByStudentId={{}}
              assignmentAvgByStudentId={assignmentAvgByStudentId}
            />
          </main>
        </div>
      </div>
    )
  }

  // ── Parent ─────────────────────────────────────────────────────────────────
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
            <div className="text-sm text-gray-400">No student record linked.</div>
          </div>
        </div>
      )
    }

    const [marksRes, childRes] = await Promise.all([
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .eq('student_id', link.student_id)
        .limit(500),
      supabase
        .from('students')
        .select('id, name, roll_no, is_active')
        .eq('id', link.student_id)
        .eq('is_active', true)
        .single(),
    ])

    const child = childRes.data

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">Student record not found or inactive.</div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <GradebookGrid students={[child]} marks={marksRes.data ?? []} />
          </main>
        </div>
      </div>
    )
  }

  // ── Student ────────────────────────────────────────────────────────────────
  if (role === 'student') {
    const studentId = roleData?.student_id

    if (!studentId) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">No student record linked.</div>
          </div>
        </div>
      )
    }

    const [marksRes, studentRes] = await Promise.all([
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .eq('student_id', studentId)
        .limit(500),
      supabase
        .from('students')
        .select('id, name, roll_no, is_active')
        .eq('id', studentId)
        .eq('is_active', true)
        .single(),
    ])

    const student = studentRes.data

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">Student record not found.</div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">My Grades</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <GradebookGrid students={[student]} marks={marksRes.data ?? []} />
          </main>
        </div>
      </div>
    )
  }

  // ── Unsupported role ───────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-400">Unsupported account role.</div>
      </div>
    </div>
  )
}
