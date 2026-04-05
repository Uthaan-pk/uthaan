import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import GradebookGrid from './GradebookGrid'
import ClassGradebookShell from './ClassGradebookShell'
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/constants'
import { buildAllMarksData, type ExamType } from '@/lib/gradeUtils'

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
  const effectiveRole = await resolveEffectiveRole(role)
  const isStaff = effectiveRole === 'teacher' || effectiveRole === 'admin'

  // ── Admin / Teacher ────────────────────────────────────────────────────────
  if (isStaff) {
    // Use the regular authenticated client — mirrors the working Results page pattern.
    // The service-role admin client silently returns null data when
    // SUPABASE_SERVICE_ROLE_KEY is missing/wrong, which is undetectable at this level.
    // RLS is confirmed permissive for staff (Results page reads students the same way).

    const timetableQuery =
      role === 'teacher'
        ? supabase
            .from('timetable')
            .select('class_num, subject, teacher_id, instructor_name')
            .eq('teacher_id', user.id)
            .limit(500)
        : supabase
            .from('timetable')
            .select('class_num, subject, teacher_id, instructor_name')
            .limit(2000)

    const [
      studentsRes,
      marksRes,
      assignmentsRes,
      submissionsRes,
      weightsRes,
      timetableRes,
      examTypesRes,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, roll_no, class_num, is_active')
        .order('name')
        .limit(2000),

      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .limit(10000),

      supabase
        .from('assignments')
        .select('id, title, subject, class_num, due_date, created_at')
        .order('created_at', { ascending: false })
        .limit(2000),

      supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, grade, submitted_at, reviewed')
        .limit(10000),

      supabase
        .from('grade_weights')
        .select(
          'id, class_num, subject, assignment_weight, exam_weight, final_weight, quiz_weight'
        )
        .eq('academic_year', CURRENT_YEAR)
        .limit(2000),

      timetableQuery,

      supabase
        .from('exam_types')
        .select('id, name, category')
        .order('created_at', { ascending: true })
        .limit(100),
    ])

    // ── Debug logging (remove once confirmed working) ──────────────────────
    console.log('[Gradebook] user.id:', user.id, '| role:', role)
    console.log('[Gradebook] studentsRes:', {
      err: studentsRes.error?.message ?? null,
      count: studentsRes.data?.length ?? 0,
      sample: studentsRes.data?.slice(0, 2),
    })
    console.log('[Gradebook] timetableRes:', {
      err: timetableRes.error?.message ?? null,
      count: timetableRes.data?.length ?? 0,
      rows: timetableRes.data?.slice(0, 5),
    })
    console.log('[Gradebook] marksRes count:', marksRes.data?.length ?? 0, 'err:', marksRes.error?.message ?? null)
    // ──────────────────────────────────────────────────────────────────────

    const allStudentsRaw = (studentsRes.data ?? []).filter(
      (s: any) => s.is_active !== false
    )
    const allAssignmentsRaw = assignmentsRes.data ?? []
    const allSubmissionsRaw = submissionsRes.data ?? []
    const allWeightsRaw = weightsRes.data ?? []
    const timetableRows = timetableRes.data ?? []
    const examTypes = (examTypesRes.data ?? []) as ExamType[]

    let visibleClassNums: number[] = []
    // Subjects this teacher is assigned to (empty for admin = no restriction)
    let visibleSubjects: string[] = []

    if (role === 'admin') {
      visibleClassNums = Array.from(
        new Set(
          allStudentsRaw
            .map((s: any) => Number(s.class_num))
            .filter((n: number) => !isNaN(n) && n > 0)
        )
      ).sort((a, b) => a - b)
    } else {
      // Teacher: scope to their timetable entries only — no fallback to all classes
      visibleClassNums = Array.from(
        new Set(
          timetableRows
            .map((row: any) => Number(row.class_num))
            .filter((n: number) => !isNaN(n) && n > 0)
        )
      ).sort((a, b) => a - b)

      visibleSubjects = Array.from(
        new Set(
          timetableRows
            .map((row: any) => (row.subject as string)?.toLowerCase?.())
            .filter(Boolean)
        )
      )
    }

    console.log('[Gradebook] visibleClassNums:', visibleClassNums)
    console.log('[Gradebook] allStudentsRaw:', allStudentsRaw.length)

    const allStudents = allStudentsRaw.filter((s: any) =>
      visibleClassNums.includes(Number(s.class_num))
    )

    console.log('[Gradebook] allStudents (after filter):', allStudents.length)

    const allAssignments = allAssignmentsRaw.filter((a: any) =>
      visibleClassNums.includes(Number(a.class_num))
    )

    const allWeights = allWeightsRaw.filter((w: any) =>
      visibleClassNums.includes(Number(w.class_num))
    )

    const studentIdSet = new Set(allStudents.map((s: any) => s.id))
    const assignmentIdSet = new Set(allAssignments.map((a: any) => a.id))

    const flatMarks = (marksRes.data ?? []).filter((m: any) =>
      studentIdSet.has(m.student_id)
    )

    const filteredSubmissions = allSubmissionsRaw.filter((s: any) =>
      assignmentIdSet.has(s.assignment_id)
    )

    const allMarks = buildAllMarksData(flatMarks)

    const assignmentAvgByStudentId: Record<string, number> = {}
    const byStudent: Record<string, number[]> = {}

    for (const sub of filteredSubmissions) {
      if (!sub.grade) continue
      const g = parseFloat(sub.grade)
      if (isNaN(g)) continue
      if (!byStudent[sub.student_id]) byStudent[sub.student_id] = []
      byStudent[sub.student_id].push(g)
    }

    for (const [sid, grades] of Object.entries(byStudent)) {
      assignmentAvgByStudentId[sid] =
        grades.reduce((a, b) => a + b, 0) / grades.length
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={effectiveRole} isImpersonating={role === 'superadmin'} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ClassGradebookShell
              allStudents={allStudents}
              allMarks={allMarks}
              flatMarks={flatMarks}
              assignments={allAssignments}
              submissions={filteredSubmissions}
              weightRows={allWeights}
              quizAvgByStudentId={{}}
              assignmentAvgByStudentId={assignmentAvgByStudentId}
              examTypes={examTypes}
              visibleSubjects={visibleSubjects}
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
        .neq('is_active', false)
        .single(),
    ])

    const child = childRes.data

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">
              Student record not found or inactive.
            </div>
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
        .neq('is_active', false)
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
