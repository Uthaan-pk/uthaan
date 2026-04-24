import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AttendanceMarker, { type Student as AttendanceStudent } from './AttendanceMarker'
import { CURRENT_TERM } from '@/lib/constants'
import { resolveEffectiveRole } from '@/lib/school'
import {
  earlyLeaveOnDay,
  leaveCoversDay,
  readLeaveReason,
  buildAttendanceMap,
} from '@/lib/attendanceLeaves'
import { TERM_START_DATE } from '@/lib/constants'
import { HelpButton } from '@/components/HelpButton'

const statusStyles: Record<string, string> = {
  present: 'bg-green-50 text-green-800',
  absent: 'bg-red-50 text-red-800',
  late: 'bg-amber-50 text-amber-800',
  excused: 'bg-sky-50 text-sky-700',
  early_leave: 'bg-indigo-50 text-indigo-700',
}

function AttendanceStatCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string
  value: string | number
  helper: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50/80'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/80'
        : tone === 'success'
          ? 'border-green-200 bg-green-50/80'
          : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-gray-500">{helper}</div>
    </div>
  )
}

function DistributionRow({
  label,
  count,
  total,
  barClass,
  valueLabel,
  helper,
}: {
  label: string
  count: number
  total: number
  barClass: string
  valueLabel?: string
  helper?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{valueLabel ?? `${count} · ${pct}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-[width] duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      {helper ? <div className="text-xs text-gray-500">{helper}</div> : null}
    </div>
  )
}

export default async function AttendancePage() {
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
  const canViewAttendance = isTeacher || isAdmin
  const today = new Date().toISOString().split('T')[0]

  if (canViewAttendance) {
    let visibleClassNums: number[] = []

    if (isTeacher) {
      const { data: timetableRows } = await supabase
        .from('timetable')
        .select('class_num')
        .eq('teacher_id', user.id)
        .limit(500)

      visibleClassNums = Array.from(
        new Set(
          (timetableRows ?? [])
            .map((row: { class_num: number | string | null }) => Number(row.class_num))
            .filter((n: number) => !isNaN(n) && n > 0)
        )
      ).sort((a, b) => a - b)
    }

    let studentsQuery = supabase
      .from('students')
      .select('id, name, roll_no, stage, class_num')
      .eq('is_active', true)
      .order('name')

    if (isTeacher) {
      if (visibleClassNums.length === 0) {
        studentsQuery = studentsQuery.in('class_num', [-1])
      } else {
        studentsQuery = studentsQuery.in('class_num', visibleClassNums)
      }
    }

    const { data: students } = await studentsQuery

    const studentIds = (students ?? []).map((s: { id: string }) => s.id)

    let logsQuery = supabase
      .from('attendance_logs')
      .select('student_id, status')
      .eq('day', today)

    if (studentIds.length > 0) {
      logsQuery = logsQuery.in('student_id', studentIds)
    } else {
      logsQuery = logsQuery.in('student_id', ['00000000-0000-0000-0000-000000000000'])
    }

    const [logsRes, leavesRes, earlyLeavesRes, termLogsRes] = await Promise.all([
      logsQuery,
      studentIds.length > 0
        ? supabase
            .from('student_leaves')
            .select('*')
            .in('student_id', studentIds)
            .limit(3000)
        : supabase
            .from('student_leaves')
            .select('*')
            .in('student_id', ['00000000-0000-0000-0000-000000000000']),
      studentIds.length > 0
        ? supabase
            .from('student_early_leaves')
            .select('*')
            .in('student_id', studentIds)
            .limit(3000)
        : supabase
            .from('student_early_leaves')
            .select('*')
            .in('student_id', ['00000000-0000-0000-0000-000000000000']),
      studentIds.length > 0
        ? supabase
            .from('attendance_logs')
            .select('student_id, status, day')
            .in('student_id', studentIds)
            .gte('day', TERM_START_DATE)
            .limit(50000)
        : Promise.resolve({ data: [] }),
    ])

    const logs = logsRes.data ?? []
    const leaves = leavesRes.data ?? []
    const earlyLeaves = earlyLeavesRes.data ?? []

    const termAttMap = buildAttendanceMap(termLogsRes.data ?? [])
    const belowThresholdCount = Object.values(termAttMap).filter(
      (pct) => pct !== null && pct < 75
    ).length

    const studentById = new Map(
      ((students ?? []) as AttendanceStudent[]).map((student) => [student.id, student] as const)
    )
    const presentCount = logs.filter((log) => log.status === 'present').length
    const absentCount = logs.filter((log) => log.status === 'absent').length
    const lateCount = logs.filter((log) => log.status === 'late').length
    const excusedCount = logs.filter((log) => log.status === 'excused').length
    const earlyLeaveCount = logs.filter((log) => log.status === 'early_leave').length
    const totalStudents = studentIds.length
    const todayAttendanceRate =
      totalStudents > 0
        ? Math.round(
            ((presentCount + lateCount + excusedCount + earlyLeaveCount) /
              totalStudents) *
              100
          )
        : 0

    const classTotals = new Map<number, number>()
    ;((students ?? []) as AttendanceStudent[]).forEach((student) => {
      classTotals.set(student.class_num, (classTotals.get(student.class_num) ?? 0) + 1)
    })

    const classStats = new Map<
      number,
      { marked: number; present: number; total: number }
    >()
    classTotals.forEach((total, classNum) => {
      classStats.set(classNum, { total, marked: 0, present: 0 })
    })

    logs.forEach((log) => {
      const student = studentById.get(log.student_id)
      if (!student) return
      const current = classStats.get(student.class_num)
      if (!current) return
      current.marked += 1
      if (['present', 'late', 'excused', 'early_leave'].includes(log.status)) {
        current.present += 1
      }
    })

    const classesMissingAttendance = Array.from(classStats.entries())
      .filter(([, stats]) => stats.marked === 0)
      .map(([classNum]) => classNum)
      .sort((a, b) => a - b)

    const classRateRows = Array.from(classStats.entries())
      .map(([classNum, stats]) => ({
        classNum,
        rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
        marked: stats.marked,
        total: stats.total,
      }))
      .sort((a, b) => a.rate - b.rate)

    const absenceCountByStudent = new Map<string, number>()
    ;(termLogsRes.data ?? []).forEach((row) => {
      if (row.status !== 'absent') return
      absenceCountByStudent.set(row.student_id, (absenceCountByStudent.get(row.student_id) ?? 0) + 1)
    })
    const repeatedAbsenceStudents = Array.from(absenceCountByStudent.entries())
      .filter(([, count]) => count >= 3)
      .map(([studentId, count]) => {
        const student = studentById.get(studentId)
        if (!student) return null
        return {
          id: studentId,
          name: student.name,
          classNum: student.class_num,
          count,
          attendance: termAttMap[studentId],
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count))
      .slice(0, 5)

    const initialStatus: Record<
      string,
      'present' | 'absent' | 'late' | 'excused' | 'early_leave'
    > = {}
    const lockedStatusByStudent: Record<string, 'excused' | 'early_leave'> = {}
    const leaveMeta: Record<string, { label: string; reason: string | null }> = {}

    logs.forEach(log => {
      initialStatus[log.student_id] = log.status as
        | 'present'
        | 'absent'
        | 'late'
        | 'excused'
        | 'early_leave'
    })

    leaves.forEach((leave: Record<string, unknown>) => {
      if (!leaveCoversDay(leave, today)) return
      const studentId = String(leave.student_id)
      lockedStatusByStudent[studentId] = 'excused'
      initialStatus[studentId] = 'excused'
      leaveMeta[studentId] = {
        label: 'Leave approved',
        reason: readLeaveReason(leave),
      }
    })

    earlyLeaves.forEach((leave: Record<string, unknown>) => {
      if (!earlyLeaveOnDay(leave, today)) return
      const studentId = String(leave.student_id)
      if (lockedStatusByStudent[studentId] === 'excused') return
      lockedStatusByStudent[studentId] = 'early_leave'
      initialStatus[studentId] = 'early_leave'
      leaveMeta[studentId] = {
        label: 'Early leave approved',
        reason: readLeaveReason(leave),
      }
    })

    return (
      <div className="uthaan-page-shell">
        <Sidebar
          email={user.email!}
          role={effectiveRole}
          isImpersonating={role === 'superadmin'}
        />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Attendance</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
              <HelpButton pageKey="attendance" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-7xl space-y-5">
              {isAdmin && (
                <>
                  <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
                    <div className="bg-[linear-gradient(135deg,#f4fbf6_0%,#ffffff_55%,#f7faf8_100%)] px-5 py-6 sm:px-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7a63]">
                            Attendance overview
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2rem]">
                              Today&apos;s attendance
                            </h2>
                            <span className="inline-flex items-center rounded-full border border-[#6fcf6f]/25 bg-[#6fcf6f]/10 px-3 py-1 text-xs font-medium text-[#1a7a4a]">
                              Admin read-only
                            </span>
                          </div>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 sm:text-[15px]">
                            Review the school-wide attendance picture first. Detailed registers stay visible below for reference, but admin stays in a stat-first view.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <AttendanceStatCard
                          label="Attendance rate"
                          value={`${todayAttendanceRate}%`}
                          helper={`${presentCount + lateCount + excusedCount + earlyLeaveCount} of ${totalStudents} students marked present, late, or excused`}
                          tone={todayAttendanceRate >= 85 ? 'success' : todayAttendanceRate >= 75 ? 'default' : 'warning'}
                        />
                        <AttendanceStatCard
                          label="Missing classes"
                          value={classesMissingAttendance.length}
                          helper="Classes with no attendance recorded yet today"
                          tone={classesMissingAttendance.length > 0 ? 'warning' : 'success'}
                        />
                        <AttendanceStatCard
                          label="Watchlist"
                          value={belowThresholdCount}
                          helper="Students below 75% attendance this term"
                          tone={belowThresholdCount > 0 ? 'danger' : 'default'}
                        />
                        <AttendanceStatCard
                          label="Repeated absences"
                          value={repeatedAbsenceStudents.length}
                          helper="Students with three or more absences this term"
                          tone={repeatedAbsenceStudents.length > 0 ? 'warning' : 'default'}
                        />
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.9fr]">
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="text-sm font-semibold text-gray-900">Today&apos;s distribution</div>
                      <div className="mt-1 text-sm text-gray-500">
                        Current status mix across all active students with recorded attendance.
                      </div>
                      <div className="mt-4 space-y-3">
                        <DistributionRow label="Present" count={presentCount} total={totalStudents} barClass="bg-green-500" />
                        <DistributionRow label="Absent" count={absentCount} total={totalStudents} barClass="bg-red-500" />
                        <DistributionRow label="Late" count={lateCount} total={totalStudents} barClass="bg-amber-500" />
                        <DistributionRow label="Excused" count={excusedCount} total={totalStudents} barClass="bg-sky-500" />
                      </div>

                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <div className="text-sm font-semibold text-gray-900">Class coverage</div>
                        <div className="mt-1 text-sm text-gray-500">
                          Lowest class attendance rates based on today&apos;s marked records.
                        </div>
                        <div className="mt-4 space-y-3">
                          {classRateRows.slice(0, 5).length > 0 ? (
                            classRateRows.slice(0, 5).map((entry) => (
                              <DistributionRow
                                key={entry.classNum}
                                label={`Class ${entry.classNum}`}
                                count={entry.marked > 0 ? entry.rate : 0}
                                total={100}
                                barClass={entry.rate < 75 ? 'bg-red-500' : entry.rate < 85 ? 'bg-amber-500' : 'bg-green-500'}
                                valueLabel={`${entry.rate}%`}
                                helper={entry.marked > 0 ? `${entry.marked} marked of ${entry.total}` : 'No attendance recorded yet'}
                              />
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-[#fafcf9] px-4 py-6 text-center text-sm text-gray-500">
                              No class attendance has been recorded yet today.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      <div className="text-sm font-semibold text-gray-900">Needs attention</div>
                      <div className="mt-1 text-sm text-gray-500">
                        Students and classes that may need follow-up from the school office.
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Classes missing attendance
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {classesMissingAttendance.length > 0 ? (
                            classesMissingAttendance.map((classNum) => (
                              <span
                                key={classNum}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                              >
                                Class {classNum}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                              All classes started
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Repeated absences
                        </div>
                        <div className="mt-3 space-y-2">
                          {repeatedAbsenceStudents.length > 0 ? (
                            repeatedAbsenceStudents.map((student) => (
                              <div
                                key={student!.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-[#fafcf9] px-3 py-3"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-gray-900">
                                    {student!.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Class {student!.classNum}
                                    {student!.attendance !== null && student!.attendance !== undefined
                                      ? ` · ${student!.attendance}% attendance`
                                      : ''}
                                  </div>
                                </div>
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                                  {student!.count} absences
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-[#fafcf9] px-4 py-6 text-center text-sm text-gray-500">
                              No repeated absence pattern is showing yet this term.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              )}
              <div>
                <AttendanceMarker
                  students={(students as unknown as AttendanceStudent[]) ?? []}
                  initialStatus={initialStatus}
                  today={today}
                  schoolId={roleData?.school_id ?? null}
                  readOnly={isAdmin}
                  lockedStatusByStudent={lockedStatusByStudent}
                  leaveMeta={leaveMeta}
                />
              </div>
            </div>
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
              <div className="text-sm font-medium text-gray-900 mb-1">
                No child linked to your account
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator to link your child.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .eq('id', link.student_id)
      .eq('is_active', true)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Student record not found
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('day, status')
      .eq('student_id', child.id)
      .order('day', { ascending: false })

    const presentDays = logs?.filter(l => l.status === 'present').length ?? 0
    const totalDays = logs?.length ?? 0
    const rate = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Attendance</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
                Viewing as: {child.name}
              </span>
              <HelpButton pageKey="attendance" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                  label="Days present"
                  value={presentDays}
                  icon="✅"
                  color="green"
                />
                <StatCard
                  label="Days absent"
                  value={totalDays - presentDays}
                  icon="❌"
                  color="red"
                />
                <StatCard
                  label="Attendance rate"
                  value={`${rate}%`}
                  icon="📊"
                  color="blue"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Attendance history
                  </h2>
                </div>

                {logs && logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div
                      key={log.day}
                      className={`px-5 py-3.5 flex items-center justify-between ${
                        i < logs.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <span className="text-sm text-gray-700">
                        {new Date(log.day).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full capitalize ${
                          statusStyles[log.status] ?? 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No attendance records yet
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    if (!roleData?.student_id) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to a student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .eq('id', roleData.student_id)
      .eq('is_active', true)
      .single()

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to an active student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('day, status')
      .eq('student_id', student.id)
      .order('day', { ascending: false })

    const presentDays = logs?.filter(l => l.status === 'present').length ?? 0
    const totalDays = logs?.length ?? 0
    const rate = totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={role} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              My Attendance
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                {CURRENT_TERM}
              </span>
              <HelpButton pageKey="attendance" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                  label="Days present"
                  value={presentDays}
                  icon="✅"
                  color="green"
                />
                <StatCard
                  label="Days absent"
                  value={totalDays - presentDays}
                  icon="❌"
                  color="red"
                />
                <StatCard
                  label="Attendance rate"
                  value={`${rate}%`}
                  icon="📊"
                  color="blue"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Attendance history
                  </h2>
                </div>

                {logs && logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div
                      key={log.day}
                      className={`px-5 py-3.5 flex items-center justify-between ${
                        i < logs.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <span className="text-sm text-gray-700">
                        {new Date(log.day).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full capitalize ${
                          statusStyles[log.status] ?? 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No attendance records yet
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900 mb-1">
            Unsupported account role
          </div>
          <div className="text-xs text-gray-400">
            Contact your administrator.
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: string
  color: 'green' | 'red' | 'blue'
}) {
  const styles =
    color === 'green'
      ? 'bg-green-50 border-green-100 text-green-800'
      : color === 'red'
        ? 'bg-red-50 border-red-100 text-red-800'
        : 'bg-blue-50 border-blue-100 text-blue-800'

  return (
    <div className={`rounded-xl border px-4 py-4 ${styles}`}>
      <div className="text-xs font-medium opacity-80 mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
