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
import { CURRENT_YEAR, TERM_START_DATE } from '@/lib/constants'
import { buildAttendanceMap } from '@/lib/attendanceLeaves'

const SCHOOL_TIME_ZONE = 'Asia/Karachi'

function formatCompactDate(value: string) {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function getSchoolWeekdayName(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: SCHOOL_TIME_ZONE,
  }).format(now)
}

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
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-5xl space-y-6">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="bg-gradient-to-r from-[#f8fbf8] via-white to-white px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Parent overview
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {child.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Class {child.class_num} · Roll {child.roll_no}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Attendance
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {attRate !== null ? `${attRate}%` : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Average
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {avgMark !== null ? `${avgMark}%` : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Due today
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {dueToday}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="text-sm font-semibold text-gray-900">
                    Child summary
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Keep track of attendance, grades, and daily school work for {child.name}.
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Link href="/my-child" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 hover:border-gray-200 transition-colors">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Profile</div>
                      <div className="mt-1 text-sm font-medium text-gray-900">View child record</div>
                    </Link>
                    <Link href="/results" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 hover:border-gray-200 transition-colors">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Results</div>
                      <div className="mt-1 text-sm font-medium text-gray-900">See marks and report card</div>
                    </Link>
                    <Link href="/fees" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 hover:border-gray-200 transition-colors">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Fees</div>
                      <div className="mt-1 text-sm font-medium text-gray-900">Review payment status</div>
                    </Link>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="text-sm font-semibold text-gray-900">
                    Quick links
                  </div>
                  <div className="mt-4 space-y-2">
                    <Link href="/announcements" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>Announcements</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/my-child" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>My Child</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/results" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>Results</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/fees" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>Fees</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    const studentId = roleData?.student_id
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const todayName = getSchoolWeekdayName()

    let dueToday = 0
    let avgMark: number | null = null

    let checklistAssignments: { id: string; title: string; subject: string; due_date: string | null }[] = []
    let checklistSubmissions: { assignment_id: string }[] = []
    let manualChecks: { assignment_id: string }[] = []

    type TodayPeriod = { period: number; subject: string; start_time: string; end_time: string }
    type UpcomingQuiz = { id: string; title: string; subject: string; status: string }
    type HomeworkItem = { id: string; title: string; subject: string; due_date: string | null }

    let todayPeriods: TodayPeriod[] = []
    let upcomingQuizzes: UpcomingQuiz[] = []
    let homeworkDue: HomeworkItem[] = []
    let attendanceToday: string | null = null

    if (studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('class_num')
        .eq('id', studentId)
        .single()

      if (student?.class_num) {
        const [assignRes, marksRes, subsRes, checksRes, timetableRes, quizzesRes, attRes] = await Promise.all([
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
          supabase
            .from('timetable')
            .select('period, subject, start_time, end_time')
            .eq('class_num', student.class_num)
            .eq('day', todayName)
            .order('period', { ascending: true }),
          supabase
            .from('quizzes')
            .select('id, title, subject, status')
            .eq('status', 'active')
            .or(`class_num.eq.${student.class_num},class_num.is.null`),
          supabase
            .from('attendance_logs')
            .select('status')
            .eq('student_id', studentId)
            .eq('day', today)
            .maybeSingle(),
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
        todayPeriods = (timetableRes.data ?? []) as TodayPeriod[]
        upcomingQuizzes = (quizzesRes.data ?? []) as UpcomingQuiz[]
        homeworkDue = (assignRes.data ?? []).filter(
          (a) => a.due_date === today || a.due_date === tomorrow
        ) as HomeworkItem[]
        attendanceToday = attRes.data?.status ?? null
      }
    }

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="student" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {t.springTerm2026}
            </span>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-5xl space-y-6">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="bg-gradient-to-r from-[#f8fbf8] via-white to-white px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t.todayOverview}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {todayName}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Keep up with today&apos;s schedule, homework, and active quizzes.
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Due today
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {dueToday}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Average
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {avgMark !== null ? `${avgMark}%` : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Quizzes
                        </div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                          {upcomingQuizzes.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.95fr]">
                <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t.todaySchedule}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Today&apos;s classes and timings.
                      </div>
                    </div>
                    <Link
                      href="/timetable"
                      className="text-xs font-medium text-[#1a2e1a] hover:underline"
                    >
                      {t.viewSchedule} →
                    </Link>
                  </div>
                  <div className="mt-4">
                    {todayPeriods.length > 0 ? (
                      <div className="space-y-2">
                        {todayPeriods.map((p) => (
                          <div key={p.period} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-[#fafcf9] px-3 py-3">
                            <div className="min-w-0">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                Period {p.period}
                              </div>
                              <div className="mt-1 text-sm font-medium text-gray-900">
                                {p.subject}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              {p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-8 text-center text-sm text-gray-500">
                        {t.noPeriods}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                      {t.attendanceStatus}
                    </div>
                    {attendanceToday === 'present' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-700">{t.present}</span>
                      </div>
                    )}
                    {attendanceToday === 'absent' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-red-600">{t.absent}</span>
                      </div>
                    )}
                    {attendanceToday === 'late' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-amber-600">{t.late}</span>
                      </div>
                    )}
                    {!attendanceToday && (
                      <div className="text-xs text-gray-400 mt-1">{t.notRecorded}</div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-4 ${upcomingQuizzes.length > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                      {t.upcomingQuizzes}
                    </div>
                    {upcomingQuizzes.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        {upcomingQuizzes.slice(0, 2).map((q) => (
                          <div key={q.id} className="text-xs text-gray-700 truncate">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6fcf6f] mr-1.5 align-middle" />
                            {q.title}
                          </div>
                        ))}
                        {upcomingQuizzes.length > 2 && (
                          <div className="text-[11px] text-gray-400">+{upcomingQuizzes.length - 2} more</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">{t.noneActive}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.9fr]">
                <div className="space-y-4">
                  {homeworkDue.length > 0 && (
                    <div className="bg-white rounded-xl border border-l-4 border-l-amber-400 border-gray-100 p-4">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">
                        {t.homeworkDue}
                      </div>
                      <div className="space-y-1.5">
                        {homeworkDue.slice(0, 4).map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-700 truncate">
                              <span className="text-gray-400 mr-1">{a.subject}</span>
                              {a.title}
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                              a.due_date === today
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}>
                              {a.due_date === today ? t.dueToday : t.dueTomorrow}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <AssignmentChecklist
                    assignments={checklistAssignments}
                    submissions={checklistSubmissions}
                    manualChecks={manualChecks}
                    studentId={studentId ?? ''}
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
                </div>
              </div>
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
        .select('student_id, status')
        .gte('day', TERM_START_DATE),
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

    const attMap = buildAttendanceMap(absenceRes.data ?? [])
    const studentsWithHighAbsences = students.filter((s) => {
      const pct = attMap[s.id]
      return pct !== null && pct !== undefined && pct < 75
    }).length

    const marks = (marksRes.data ?? []) as FlatMarkRow[]
    const weights = (weightsRes.data ?? []) as WeightRow[]
    const studentsFailing = students.filter(student => {
      const grades = computeSubjectFinalGrades(student.id, marks, weights)
      return grades.some(grade => grade.overall < 50)
    }).length

    return (
      <div className="uthaan-page-shell">
        <Sidebar
          email={user.email!}
          role="admin"
          isImpersonating={role === 'superadmin'}
        />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              {t.dashboard}
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Admin overview
            </span>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl space-y-6">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="bg-gradient-to-r from-[#f8fbf8] via-white to-white px-5 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Control centre
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        School dashboard
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Review the issues that need attention first, then jump into the right workflow.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/students" className="uthaan-button-secondary text-xs">Students</Link>
                      <Link href="/attendance" className="uthaan-button-secondary text-xs">Attendance</Link>
                      <Link href="/announcements" className="uthaan-button-secondary text-xs">Announcements</Link>
                      <Link href="/marks" className="uthaan-button-secondary text-xs">Results</Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Needs attention
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          High-priority issues based on current school data.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Link href="/fees" className={`rounded-xl border px-4 py-4 transition-colors hover:border-gray-200 ${overdueFeeStudentIds.size > 0 ? 'bg-red-50 border-red-200' : 'bg-[#fafcf9] border-gray-100'}`}>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Overdue fees</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{overdueFeeStudentIds.size}</div>
                        <div className="mt-1 text-xs text-gray-500">Students with overdue balances</div>
                      </Link>
                      <Link href="/attendance" className={`rounded-xl border px-4 py-4 transition-colors hover:border-gray-200 ${studentsWithHighAbsences > 0 ? 'bg-amber-50 border-amber-200' : 'bg-[#fafcf9] border-gray-100'}`}>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Low attendance</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{studentsWithHighAbsences}</div>
                        <div className="mt-1 text-xs text-gray-500">Below 75% attendance</div>
                      </Link>
                      <Link href="/marks" className={`rounded-xl border px-4 py-4 transition-colors hover:border-gray-200 ${studentsFailing > 0 ? 'bg-red-50 border-red-200' : 'bg-[#fafcf9] border-gray-100'}`}>
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Failing students</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{studentsFailing}</div>
                        <div className="mt-1 text-xs text-gray-500">One or more subjects below pass</div>
                      </Link>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="text-sm font-semibold text-gray-900">
                      Quick actions
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Link href="/admin" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-4 hover:border-gray-200">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">{t.adminPanel}</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">Manage students and parents</div>
                      </Link>
                      <Link href="/admin/leaves" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-4 hover:border-gray-200">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Leave management</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">Approve full-day and early leave</div>
                      </Link>
                      <Link href="/announcements" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-4 hover:border-gray-200">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Announcements</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">Post updates for families and staff</div>
                      </Link>
                      <Link href="/marks" className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-4 hover:border-gray-200">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Results</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">Review final grades and report cards</div>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="text-sm font-semibold text-gray-900">Snapshot</div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                      <div className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">{t.totalStudents}</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{totalStudents}</div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Overdue fees</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{overdueFeeStudentIds.size}</div>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">Attendance watchlist</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{studentsWithHighAbsences}</div>
                      </div>
                    </div>
                  </div>

                  {recentAnnouncements.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-50">
                        <div className="text-sm font-semibold text-gray-900">
                          {t.recentAnnouncements}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {recentAnnouncements.map((a) => (
                          <div key={a.id} className="px-5 py-3.5 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-[#6fcf6f] flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900">{a.title}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCompactDate(a.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const todayName = getSchoolWeekdayName()
  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const isTeacher = role === 'teacher'

  type TimetableEntry = { class_num: number; subject: string; start_time: string; end_time: string; period: number }
  type AssignmentRef = { id: string; title: string; class_num: number }
  // Supabase returns the joined record as an array or single object depending on FK direction
  type PendingSubmission = { assignment_id: string; assignment: AssignmentRef | AssignmentRef[] | null }

  let teacherTimetableQuery = supabase
    .from('timetable')
    .select('class_num, subject, start_time, end_time, period')
    .eq('day', todayName)
    .order('period', { ascending: true })

  if (isTeacher) {
    teacherTimetableQuery = teacherTimetableQuery.eq('teacher_id', user.id)
  }

  const [
    studentsRes,
    submissionsRes,
    announcementsRes,
    attendanceRes,
    teacherTimetableRes,
  ] = await Promise.all([
    supabase.from('students').select('id').eq('is_active', true),
    supabase
      .from('assignment_submissions')
      .select('assignment_id, assignment:assignments(id, title, class_num)')
      .eq('reviewed', false)
      .limit(100),
    supabase
      .from('announcements')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('attendance_logs').select('id').eq('day', today),
    teacherTimetableQuery,
  ])

  const totalStudents = (studentsRes.data ?? []).length
  const todayLogCount = (attendanceRes.data ?? []).length
  const attendanceMarked = totalStudents > 0 && todayLogCount >= totalStudents
  const recentAnnouncements = announcementsRes.data ?? []

  const classesToday = (teacherTimetableRes.data ?? []) as TimetableEntry[]
  const classesTodayCount = classesToday.length
  const attendanceNotTakenCount = attendanceMarked ? 0 : classesTodayCount

  // Group unreviewed submissions by assignment, pick top 5
  const pendingSubs = (submissionsRes.data ?? []) as unknown as PendingSubmission[]
  const submissionsByAssignment = new Map<string, { title: string; class_num: number; count: number }>()
  for (const sub of pendingSubs) {
    if (!sub.assignment) continue
    // Supabase may return single object or array depending on FK direction
    const asgn: AssignmentRef = Array.isArray(sub.assignment) ? sub.assignment[0] : sub.assignment
    if (!asgn) continue
    if (!submissionsByAssignment.has(asgn.id)) {
      submissionsByAssignment.set(asgn.id, { title: asgn.title, class_num: asgn.class_num, count: 0 })
    }
    submissionsByAssignment.get(asgn.id)!.count++
  }
  const needsGradingList = Array.from(submissionsByAssignment.values()).slice(0, 5)
  const ungraded = pendingSubs.length

  return (
    <div className="uthaan-page-shell">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">
            {t.dashboard}
          </h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {t.springTerm2026}
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="bg-gradient-to-r from-[#f8fbf8] via-white to-white px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Morning briefing
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {todayDisplay}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Review classes, attendance follow-up, and grading work in one place.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Classes today</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{classesTodayCount}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Attendance</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{attendanceNotTakenCount}</div>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Need grading</div>
                      <div className="mt-1 text-xl font-semibold text-gray-900">{ungraded}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-3">
                    My classes today
                  </div>
                  {classesToday.length > 0 ? (
                    <div className="space-y-2">
                  {classesToday.map((cls) => (
                    <div
                      key={`${cls.class_num}-${cls.period}`}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <span className="text-sm font-medium text-gray-900 flex-1">
                        {cls.subject}
                        <span className="text-gray-400 font-normal"> · Class {cls.class_num}</span>
                        <span className="text-gray-400 font-normal"> · {cls.start_time?.slice(0, 5)}–{cls.end_time?.slice(0, 5)}</span>
                      </span>
                      {attendanceMarked ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                          Done
                        </span>
                      ) : (
                        <Link
                          href="/attendance"
                          className="text-[11px] font-medium px-3 py-1 rounded-lg bg-[#1a2e1a] text-white hover:bg-[#2a3e2a] transition-colors"
                        >
                          Mark attendance
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 px-4 py-6 text-center text-sm text-gray-400">
                      No classes scheduled for today
                    </div>
                  )}
                </div>

                {needsGradingList.length > 0 && (
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-3">
                      Needs grading
                    </div>
                    <div className="space-y-2">
                  {needsGradingList.map((item) => (
                    <div
                      key={item.title}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <span className="text-sm text-gray-900 flex-1">
                        {item.title}
                        <span className="text-gray-400"> · Class {item.class_num} · {item.count} submission{item.count !== 1 ? 's' : ''} pending</span>
                      </span>
                      <Link
                        href="/marks"
                        className="text-[11px] font-medium text-[#1a2e1a] hover:underline flex-shrink-0"
                      >
                        Gradebook →
                      </Link>
                    </div>
                  ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="text-sm font-semibold text-gray-900">
                    Quick actions
                  </div>
                  <div className="mt-4 space-y-2">
                    <Link href="/attendance" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>Mark attendance</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/marks" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>Open gradebook</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                    <Link href="/announcements" className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-200">
                      <span>School announcements</span>
                      <span className="text-gray-400">→</span>
                    </Link>
                  </div>
                </div>

                {recentAnnouncements.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                      <div className="text-sm font-semibold text-gray-900">
                        {t.recentAnnouncements}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {recentAnnouncements.map((a) => (
                        <div key={a.id} className="px-5 py-3.5 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] flex-shrink-0" />
                          <div className="text-sm text-gray-900 flex-1">
                            {a.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCompactDate(a.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
