import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import GradebookGrid from './GradebookGrid'
import ClassGradebookShell from './ClassGradebookShell'
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/constants'
import {
  buildAllMarksData,
  type ExamType,
  type WeightRow,
  type FlatMarkRow,
} from '@/lib/gradeUtils'
import CsvImport from './CsvImport'

type StudentRow = {
  id: string
  name: string
  roll_no: string
  class_num: number | null
  is_active: boolean | null
}

type AssignmentRow = {
  id: string
  title: string
  subject: string
  class_num: number | null
  due_date: string | null
  created_at: string | null
}

type SubmissionRow = {
  id: string
  assignment_id: string
  student_id: string
  grade: string | null
  submitted_at: string | null
  reviewed: boolean | null
}

type TimetableRow = {
  class_num: number | null
  subject: string | null
}

function normalizeSubject(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export default async function MarksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const isTeacher = effectiveRole === 'teacher'
  const isAdmin = effectiveRole === 'admin'
  const canViewMarks = isTeacher || isAdmin

  if (canViewMarks) {
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
    console.log(
      '[Gradebook] marksRes count:',
      marksRes.data?.length ?? 0,
      'err:',
      marksRes.error?.message ?? null
    )

    const allStudentsRaw = ((studentsRes.data ?? []) as StudentRow[]).filter(
      s => s.is_active !== false
    )
    const allAssignmentsRaw = (assignmentsRes.data ?? []) as AssignmentRow[]
    const allSubmissionsRaw = (submissionsRes.data ?? []) as SubmissionRow[]
    const allWeightsRaw = (weightsRes.data ?? []) as WeightRow[]
    const timetableRows = (timetableRes.data ?? []) as TimetableRow[]
    const examTypes = (examTypesRes.data ?? []) as ExamType[]

    let visibleClassNums: number[] = []
    let visibleSubjects: string[] = []

    if (role === 'admin') {
      visibleClassNums = Array.from(
        new Set(
          allStudentsRaw
            .map(s => Number(s.class_num))
            .filter((n: number) => !isNaN(n) && n > 0)
        )
      ).sort((a, b) => a - b)
    } else {
      visibleClassNums = Array.from(
        new Set(
          timetableRows
            .map(row => Number(row.class_num))
            .filter((n: number) => !isNaN(n) && n > 0)
        )
      ).sort((a, b) => a - b)

      visibleSubjects = Array.from(
        new Set(
          timetableRows
            .map(row => normalizeSubject(row.subject))
            .filter((subject): subject is string => Boolean(subject))
        )
      )
    }

    console.log('[Gradebook] visibleClassNums:', visibleClassNums)
    console.log('[Gradebook] allStudentsRaw:', allStudentsRaw.length)

    const allStudents = allStudentsRaw.filter(s =>
      visibleClassNums.includes(Number(s.class_num))
    )

    console.log('[Gradebook] allStudents (after filter):', allStudents.length)

    const allAssignments = allAssignmentsRaw.filter(a => {
      const classOk = visibleClassNums.includes(Number(a.class_num))
      if (!classOk) return false

      if (!isTeacher) return true
      return visibleSubjects.includes(normalizeSubject(a.subject))
    })

    const allWeights = allWeightsRaw.filter(w =>
      visibleClassNums.includes(Number(w.class_num))
    )

    const studentIdSet = new Set(allStudents.map(s => s.id))
    const assignmentIdSet = new Set(allAssignments.map(a => a.id))

    const flatMarks = ((marksRes.data ?? []) as FlatMarkRow[]).filter(m => {
      if (!studentIdSet.has(m.student_id)) return false
      if (!isTeacher) return true
      return visibleSubjects.includes(normalizeSubject(m.subject))
    })

    const filteredSubmissions = allSubmissionsRaw.filter(s =>
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
        <Sidebar
          email={user.email!}
          role={effectiveRole}
          isImpersonating={role === 'superadmin'}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <div className="flex items-center gap-3">
              {isTeacher && roleData?.school_id && (
                <CsvImport
                  schoolId={roleData.school_id}
                  visibleSubjects={visibleSubjects}
                />
              )}
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                {CURRENT_TERM}
              </span>
            </div>
          </header>

          <main className="uthaan-page-content">
            <ClassGradebookShell
              allStudents={allStudents}
              allMarks={allMarks}
              assignments={allAssignments}
              submissions={filteredSubmissions}
              weightRows={allWeights}
              quizAvgByStudentId={{}}
              assignmentAvgByStudentId={assignmentAvgByStudentId}
              examTypes={examTypes}
              visibleSubjects={visibleSubjects}
              schoolId={roleData?.school_id ?? null}
              readOnlyGradesOnly={isAdmin}
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
          <main className="uthaan-page-content">
            <GradebookGrid students={[child]} marks={marksRes.data ?? []} readOnly />
          </main>
        </div>
      </div>
    )
  }

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
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {student.name}
            </span>
          </header>
          <main className="uthaan-page-content">
            <GradebookGrid students={[student]} marks={marksRes.data ?? []} readOnly />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-400">Unsupported account role.</div>
      </div>
    </div>
  )
}
