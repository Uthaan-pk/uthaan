import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import { translations, type Language } from '@/lib/translations'
import AssignmentChecklist from './AssignmentChecklist'
import { resolveEffectiveRole } from '@/lib/school'
import {
  computeSubjectFinalGrades,
  type FlatMarkRow,
  type WeightRow,
} from '@/lib/gradeUtils'
import { CURRENT_YEAR } from '@/lib/constants'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('uthaan_lang')?.value
  const lang: Language = cookieLang === 'ur' ? 'ur' : 'en'
  const t = translations[lang] ?? translations.en

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
  const effectiveRole = await resolveEffectiveRole(role ?? '')

  if (role === 'superadmin') {
    const impersonating = cookieStore.get('impersonate_school_id')?.value
    if (!impersonating) redirect('/superadmin')
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
              <div className="text-sm font-medium text-gray-900 mb-1">
                {t.noChildLinkedYet}
              </div>
              <div className="text-xs text-gray-400">
                {t.contactSchoolAdministrator}
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num, roll_no')
      .eq('id', link.student_id)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">
              {t.studentRecordNotFound}
            </div>
          </div>
        </div>
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const [attRes, marksRes, assignmentsRes] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('status')
        .eq('student_id', child.id),
      supabase.from('marks').select('percent').eq('student_id', child.id),
      supabase
        .from('assignments')
        .select('id, due_date')
        .eq('class_num', child.class_num),
    ])

    const att = attRes.data ?? []
    const attRate =
      att.length > 0
        ? Math.round(
            (att.filter((l) => l.status === 'present').length / att.length) *
              100
          )
        : null

    const dueToday = (assignmentsRes.data ?? []).filter(
      (a) => a.due_date === today
    ).length

    const marks = marksRes.data ?? []
    const avgMark =
      marks.length > 0
        ? Math.round(
            marks.reduce((a, m) => a + Number(m.percent), 0) / marks.length
          )
        : null

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <Link
                href="/my-child"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.attendance}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {attRate !== null ? `${attRate}%` : '—'}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {t.overallRate}
                </div>
              </Link>

              <Link
                href="/marks"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.averageMark}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {avgMark !== null ? `${avgMark}%` : '—'}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {t.acrossAllSubjects}
                </div>
              </Link>

              <Link
                href="/assignments"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors col-span-2"
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.dueToday}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {dueToday}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {t.assignmentsFor} {child.name}
                </div>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    const studentId = roleData?.student_id
    const today = new Date().toISOString().split('T')[0]
    let dueToday = 0
    let avgMark: number | null = null

    let checklistAssignments: { id: string; title: string; subject: string; due_date: string | null }[] = []
    let checklistSubmissions: { assignment_id: string }[] = []
    let manualChecks: { assignment_id: string }[] = []

    if (studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('class_num')
        .eq('id', studentId)
        .single()

      if (student?.class_num) {
        const [assignRes, marksRes, subsRes, checksRes] = await Promise.all([
          supabase
            .from('assignments')
            .select('id, title, subject, due_date')
            .eq('class_num', student.class_num)
            .order('due_date', { ascending: true })
            .limit(100),
          supabase.from('marks').select('percent').eq('student_id', studentId),
          supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('student_id', studentId),
          supabase
            .from('assignment_manual_checks')
            .select('assignment_id')
            .eq('student_id', studentId),
        ])

        dueToday = (assignRes.data ?? []).filter(
          (a) => a.due_date === today
        ).length

        const marks = marksRes.data ?? []
        avgMark =
          marks.length > 0
            ? Math.round(
                marks.reduce((a, m) => a + Number(m.percent), 0) / marks.length
              )
            : null

        checklistAssignments = assignRes.data ?? []
        checklistSubmissions = subsRes.data ?? []
        manualChecks = checksRes.data ?? []
      }
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="student" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {t.springTerm2026}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/assignments"
                  className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                    dueToday > 0
                      ? 'border-l-4 border-l-amber-400 border-gray-100'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    {t.dueToday}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {dueToday}
                  </div>
                  <div
                    className={`text-[11px] mt-1 font-medium ${
                      dueToday > 0 ? 'text-amber-600' : 'text-gray-400'
                    }`}
                  >
                    {dueToday > 0 ? `${t.submitNow} →` : t.allClear}
                  </div>
                </Link>

                <Link
                  href="/marks"
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    {t.myAverage}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {avgMark !== null ? `${avgMark}%` : '—'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {t.viewGradebook} →
                  </div>
                </Link>

                <Link
                  href="/timetable"
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    {t.timetableView}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-2">
                    {t.viewSchedule} →
                  </div>
                </Link>

                <Link
                  href="/quizzes"
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    {t.quizzes}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-2">
                    {t.checkActive} →
                  </div>
                </Link>
              </div>

              <AssignmentChecklist
                assignments={checklistAssignments}
                submissions={checklistSubmissions}
                manualChecks={manualChecks}
                studentId={studentId ?? ''}
              />
            </div>
          </main>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  if (effectiveRole === 'admin') {
    const [
      studentsRes,
      feesRes,
      absenceRes,
      marksRes,
      weightsRes,
      announcementsRes,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, class_num')
        .eq('is_active', true),
      supabase
        .from('fees')
        .select('student_id, paid, due_date'),
      supabase
        .from('attendance_logs')
        .select('student_id, status'),
      supabase
        .from('marks')
        .select('student_id, subject, exam, percent'),
      supabase
        .from('grade_weights')
        .select(
          'id, class_num, subject, assignment_weight, exam_weight, final_weight, quiz_weight'
        )
        .eq('academic_year', CURRENT_YEAR),
      supabase
        .from('announcements')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const students = studentsRes.data ?? []
    const totalStudents = students.length
    const recentAnnouncements = announcementsRes.data ?? []

    const overdueFeeStudentIds = new Set(
      (feesRes.data ?? [])
        .filter(f => !f.paid && f.due_date < today)
        .map(f => f.student_id)
    )

    const absencesByStudent = (absenceRes.data ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        if (row.status === 'absent') {
          acc[row.student_id] = (acc[row.student_id] ?? 0) + 1
        }
        return acc
      },
      {}
    )
    const studentsWithHighAbsences = Object.values(absencesByStudent).filter(
      count => count > 10
    ).length

    const marks = (marksRes.data ?? []) as FlatMarkRow[]
    const weights = (weightsRes.data ?? []) as WeightRow[]
    const studentsFailing = students.filter(student => {
      const grades = computeSubjectFinalGrades(student.id, marks, weights)
      return grades.some(grade => grade.overall < 50)
    }).length

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar
          email={user.email!}
          role="admin"
          isImpersonating={role === 'superadmin'}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Admin overview
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/students"
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    {t.totalStudents}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {totalStudents}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {t.viewAllStudents} →
                  </div>
                </Link>

                <Link
                  href="/fees"
                  className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                    overdueFeeStudentIds.size > 0
                      ? 'border-l-4 border-l-red-400 border-gray-100'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    Overdue Fees
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {overdueFeeStudentIds.size}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Students with unpaid overdue fees →
                  </div>
                </Link>

                <Link
                  href="/attendance"
                  className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                    studentsWithHighAbsences > 0
                      ? 'border-l-4 border-l-amber-400 border-gray-100'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    High Absences
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {studentsWithHighAbsences}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Students above 10 absences →
                  </div>
                </Link>

                <Link
                  href="/marks"
                  className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                    studentsFailing > 0
                      ? 'border-l-4 border-l-red-400 border-gray-100'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    Failing Students
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {studentsFailing}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Students failing one or more subjects →
                  </div>
                </Link>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide">
                    Admin tools
                  </div>
                  <div className="text-xl font-semibold text-gray-900 mt-0.5">
                    Read-only academics
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-100 hidden sm:block" />

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/admin"
                    className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                  >
                    {t.adminPanel} →
                  </Link>
                  <Link
                    href="/admin/leaves"
                    className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                  >
                    Leave Management →
                  </Link>
                  <Link
                    href="/marks"
                    className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                  >
                    Final grades →
                  </Link>
                </div>
              </div>

              {recentAnnouncements.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-3">
                    {t.recentAnnouncements}
                  </div>
                  <div className="space-y-2">
                    {recentAnnouncements.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] flex-shrink-0" />
                        <div className="text-sm text-gray-900 flex-1">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-gray-400 flex-shrink-0">
                          {new Date(a.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  const [
    studentsRes,
    assignmentsRes,
    submissionsRes,
    quizzesRes,
    announcementsRes,
    attendanceRes,
  ] = await Promise.all([
    supabase.from('students').select('id').eq('is_active', true),
    supabase.from('assignments').select('id, due_date'),
    supabase
      .from('assignment_submissions')
      .select('id, reviewed')
      .eq('reviewed', false),
    supabase.from('quizzes').select('id').eq('status', 'active'),
    supabase
      .from('announcements')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('attendance_logs').select('id').eq('day', today),
  ])

  const totalStudents = (studentsRes.data ?? []).length
  const ungraded = (submissionsRes.data ?? []).length
  const dueToday = (assignmentsRes.data ?? []).filter(
    (a) => a.due_date === today
  ).length
  const activeQuizzes = (quizzesRes.data ?? []).length
  const todayLogCount = (attendanceRes.data ?? []).length
  const attendanceMarked = totalStudents > 0 && todayLogCount >= totalStudents
  const recentAnnouncements = announcementsRes.data ?? []

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
            {t.dashboard}
          </h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {t.springTerm2026}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/assignments"
                className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                  ungraded > 0
                    ? 'border-l-4 border-l-amber-400 border-gray-100'
                    : 'border-gray-100'
                }`}
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.toGrade}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {ungraded}
                </div>
                <div
                  className={`text-[11px] mt-1 font-medium ${
                    ungraded > 0 ? 'text-amber-600' : 'text-gray-400'
                  }`}
                >
                  {ungraded > 0 ? `${t.gradeNow} →` : t.allCaughtUp}
                </div>
              </Link>

              <Link
                href="/attendance"
                className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${
                  !attendanceMarked
                    ? 'border-l-4 border-l-red-400 border-gray-100'
                    : 'border-gray-100'
                }`}
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.attendance}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {attendanceMarked ? `${t.marked} ✓` : t.notMarkedToday}
                </div>
                <div
                  className={`text-[11px] mt-1 font-medium ${
                    !attendanceMarked ? 'text-red-500' : 'text-green-700'
                  }`}
                >
                  {attendanceMarked ? `${t.viewRecords} →` : `${t.markNow} →`}
                </div>
              </Link>

              <Link
                href="/assignments"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.dueToday}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {dueToday}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {t.assignment}
                  {dueToday !== 1 && lang === 'en' ? 's' : ''} · {t.view} →
                </div>
              </Link>

              <Link
                href="/quizzes"
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors"
              >
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  {t.liveQuizzes}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {activeQuizzes}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {activeQuizzes > 0
                    ? `${t.studentsActiveNow} →`
                    : t.noneActive}
                </div>
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">
                  {t.totalStudents}
                </div>
                <div className="text-xl font-semibold text-gray-900 mt-0.5">
                  {totalStudents}
                </div>
              </div>

              <div className="w-px h-8 bg-gray-100 hidden sm:block" />

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/announcements"
                  className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                >
                  {t.postAnnouncement} →
                </Link>
                <Link
                  href="/fees"
                  className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                >
                  Assign fee →
                </Link>
                <Link
                  href="/students"
                  className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                >
                  {t.viewAllStudents} →
                </Link>
              </div>
            </div>

            {recentAnnouncements.length > 0 && (
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-3">
                  {t.recentAnnouncements}
                </div>
                <div className="space-y-2">
                  {recentAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] flex-shrink-0" />
                      <div className="text-sm text-gray-900 flex-1">
                        {a.title}
                      </div>
                      <div className="text-[11px] text-gray-400 flex-shrink-0">
                        {new Date(a.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
