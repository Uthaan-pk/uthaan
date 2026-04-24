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
import { HelpButton } from '@/components/HelpButton'
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  ClipboardList,
  FileText,
  GraduationCap,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react'

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

function DashboardHero({
  eyebrow,
  title,
  description,
  badge,
  actions,
  stats,
}: {
  eyebrow: string
  title: string
  description: string
  badge?: string
  actions?: React.ReactNode
  stats: Array<{ label: string; value: string | number; tone?: 'default' | 'alert' | 'success' }>
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
      <div className="bg-[linear-gradient(135deg,#f4fbf6_0%,#ffffff_55%,#f7faf8_100%)] px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7a63]">
              {eyebrow}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2rem]">
                {title}
              </h2>
              {badge ? (
                <span className="inline-flex items-center rounded-full border border-[#6fcf6f]/25 bg-[#6fcf6f]/10 px-3 py-1 text-xs font-medium text-[#1a7a4a]">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 sm:text-[15px]">
              {description}
            </p>
          </div>

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border px-4 py-4 ${
                stat.tone === 'alert'
                  ? 'border-amber-200 bg-amber-50/70'
                  : stat.tone === 'success'
                    ? 'border-green-200 bg-green-50/70'
                    : 'border-white/70 bg-white/80'
              }`}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DashboardSection({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {description ? <div className="mt-1 text-sm text-gray-500">{description}</div> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ActionTile({
  href,
  eyebrow,
  title,
  body,
  icon,
}: {
  href: string
  eyebrow: string
  title: string
  body: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl border border-[#6fcf6f]/15 bg-[#6fcf6f]/10 p-2 text-[#1a7a4a]">
          {icon}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
      </div>
      <div className="mt-4 text-[11px] font-medium uppercase tracking-wide text-gray-500">{eyebrow}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-gray-500">{body}</div>
    </Link>
  )
}

function SignalCard({
  href,
  label,
  value,
  helper,
  tone = 'default',
}: {
  href: string
  label: string
  value: number | string
  helper: string
  tone?: 'default' | 'danger' | 'warning'
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50/75'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/75'
        : 'border-gray-200 bg-[#fafcf9]'

  return (
    <Link
      href={href}
      className={`rounded-2xl border px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-gray-300 ${toneClass}`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</div>
      <div className="mt-1 text-xs leading-5 text-gray-500">{helper}</div>
    </Link>
  )
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
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">
                {child.name}
              </span>
              <HelpButton pageKey="dashboard-parent" />
            </div>
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
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                Admin overview
              </span>
              <HelpButton pageKey="dashboard-admin" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl space-y-6">
              <DashboardHero
                eyebrow="Control centre"
                title="School dashboard"
                description="Review the school’s biggest operational issues first, then move directly into the right workflow without hunting across pages."
                badge="Admin overview"
                actions={
                  <>
                    <Link href="/students" className="uthaan-button-secondary text-xs">Students</Link>
                    <Link href="/attendance" className="uthaan-button-secondary text-xs">Attendance</Link>
                    <Link href="/announcements" className="uthaan-button-secondary text-xs">Announcements</Link>
                    <Link href="/marks" className="uthaan-button-secondary text-xs">Results</Link>
                  </>
                }
                stats={[
                  { label: 'Total students', value: totalStudents },
                  { label: 'Overdue fees', value: overdueFeeStudentIds.size, tone: overdueFeeStudentIds.size > 0 ? 'alert' : 'default' },
                  { label: 'Attendance watchlist', value: studentsWithHighAbsences, tone: studentsWithHighAbsences > 0 ? 'alert' : 'default' },
                ]}
              />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
                <div className="space-y-4">
                  <DashboardSection
                    title="Needs attention"
                    description="High-priority issues surfaced from current school records."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <SignalCard
                        href="/fees"
                        label="Overdue fees"
                        value={overdueFeeStudentIds.size}
                        helper="Students with overdue balances"
                        tone={overdueFeeStudentIds.size > 0 ? 'danger' : 'default'}
                      />
                      <SignalCard
                        href="/attendance/low"
                        label="Low attendance"
                        value={studentsWithHighAbsences}
                        helper="Below 75% attendance"
                        tone={studentsWithHighAbsences > 0 ? 'warning' : 'default'}
                      />
                      <SignalCard
                        href="/marks"
                        label="Failing students"
                        value={studentsFailing}
                        helper="One or more subjects below pass"
                        tone={studentsFailing > 0 ? 'danger' : 'default'}
                      />
                    </div>
                  </DashboardSection>

                  <DashboardSection
                    title="Quick actions"
                    description="Jump into the workflows school operators use most."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ActionTile
                        href="/admin"
                        eyebrow={t.adminPanel}
                        title="Manage students and parents"
                        body="Open the operational admin area for records, linking, and imports."
                        icon={<Users className="h-4 w-4" />}
                      />
                      <ActionTile
                        href="/admin/leaves"
                        eyebrow="Leave management"
                        title="Approve leave requests"
                        body="Review full-day and early-leave items that need action."
                        icon={<CalendarCheck2 className="h-4 w-4" />}
                      />
                      <ActionTile
                        href="/announcements"
                        eyebrow="Announcements"
                        title="Post a school update"
                        body="Send a clean update to staff and families from one place."
                        icon={<Megaphone className="h-4 w-4" />}
                      />
                      <ActionTile
                        href="/marks"
                        eyebrow="Results"
                        title="Review grades and report cards"
                        body="Open grade workflows and check final performance summaries."
                        icon={<GraduationCap className="h-4 w-4" />}
                      />
                    </div>
                  </DashboardSection>
                </div>

                <div className="space-y-4">
                  <DashboardSection
                    title="Operating snapshot"
                    description="A quick read of the school’s current health."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                      <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          <Users className="h-3.5 w-3.5" />
                          {t.totalStudents}
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{totalStudents}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Overdue fees
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{overdueFeeStudentIds.size}</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Attendance watchlist
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{studentsWithHighAbsences}</div>
                      </div>
                    </div>
                  </DashboardSection>

                  {recentAnnouncements.length > 0 && (
                    <DashboardSection
                      title={t.recentAnnouncements}
                      description="Latest school communications posted from the admin side."
                    >
                      <div className="space-y-2">
                        {recentAnnouncements.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#fafcf9] px-4 py-3.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6fcf6f]/10 text-[#1a7a4a]">
                              <Bell className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900">{a.title}</div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCompactDate(a.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DashboardSection>
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
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {t.springTerm2026}
            </span>
            <HelpButton pageKey="dashboard-teacher" />
          </div>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">
            <DashboardHero
              eyebrow="Morning briefing"
              title={todayDisplay}
              description="Review your classes, attendance follow-up, and grading workload from one calm staff dashboard."
              badge="Teacher overview"
              actions={
                <>
                  <Link href="/attendance" className="uthaan-button-secondary text-xs">Attendance</Link>
                  <Link href="/marks" className="uthaan-button-secondary text-xs">Gradebook</Link>
                  <Link href="/announcements" className="uthaan-button-secondary text-xs">Announcements</Link>
                </>
              }
              stats={[
                { label: 'Classes today', value: classesTodayCount },
                { label: 'Attendance to mark', value: attendanceNotTakenCount, tone: attendanceNotTakenCount > 0 ? 'alert' : 'success' },
                { label: 'Need grading', value: ungraded, tone: ungraded > 0 ? 'alert' : 'default' },
              ]}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
              <div className="space-y-4">
                <DashboardSection
                  title="My classes today"
                  description="Today’s schedule, with a direct handoff into attendance when needed."
                >
                  {classesToday.length > 0 ? (
                    <div className="space-y-2">
                      {classesToday.map((cls) => (
                        <div
                          key={`${cls.class_num}-${cls.period}`}
                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#fafcf9] px-4 py-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6fcf6f]/10 text-[#1a7a4a]">
                            <CalendarCheck2 className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-900">
                            {cls.subject}
                            <span className="font-normal text-gray-400"> · Class {cls.class_num}</span>
                            <span className="font-normal text-gray-400"> · {cls.start_time?.slice(0, 5)}–{cls.end_time?.slice(0, 5)}</span>
                          </span>
                          {attendanceMarked ? (
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-medium text-green-700">
                              Attendance done
                            </span>
                          ) : (
                            <Link
                              href="/attendance"
                              className="uthaan-button-primary text-[11px]"
                            >
                              Mark attendance
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-[#fafcf9] px-4 py-8 text-center text-sm text-gray-400">
                      No classes scheduled for today
                    </div>
                  )}
                </DashboardSection>

                {needsGradingList.length > 0 && (
                  <DashboardSection
                    title="Needs grading"
                    description="Assignments waiting for teacher review right now."
                  >
                    <div className="space-y-2">
                      {needsGradingList.map((item) => (
                        <div
                          key={item.title}
                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#fafcf9] px-4 py-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6fcf6f]/10 text-[#1a7a4a]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-sm text-gray-900">
                            {item.title}
                            <span className="text-gray-400"> · Class {item.class_num} · {item.count} submission{item.count !== 1 ? 's' : ''} pending</span>
                          </span>
                          <Link
                            href="/marks"
                            className="text-[11px] font-medium text-[#1a2e1a] hover:underline"
                          >
                            Open gradebook →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </DashboardSection>
                )}
              </div>

              <div className="space-y-4">
                <DashboardSection
                  title="Quick actions"
                  description="The staff workflows most likely to matter today."
                >
                  <div className="space-y-3">
                    <ActionTile
                      href="/attendance"
                      eyebrow="Attendance"
                      title="Mark today’s attendance"
                      body="Record status for current classes without leaving the dashboard flow."
                      icon={<CalendarCheck2 className="h-4 w-4" />}
                    />
                    <ActionTile
                      href="/marks"
                      eyebrow="Gradebook"
                      title="Open marks and grading"
                      body="Review pending work, update scores, and continue result prep."
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <ActionTile
                      href="/announcements"
                      eyebrow="Announcements"
                      title="Review school updates"
                      body="Check the latest notices or post a new one for students and families."
                      icon={<Megaphone className="h-4 w-4" />}
                    />
                  </div>
                </DashboardSection>

                {recentAnnouncements.length > 0 && (
                  <DashboardSection
                    title={t.recentAnnouncements}
                    description="The latest school messages visible from your side."
                  >
                    <div className="space-y-2">
                      {recentAnnouncements.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#fafcf9] px-4 py-3.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6fcf6f]/10 text-[#1a7a4a]">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-sm text-gray-900">
                            {a.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCompactDate(a.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DashboardSection>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
