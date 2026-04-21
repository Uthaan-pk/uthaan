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

const statusStyles: Record<string, string> = {
  present: 'bg-green-50 text-green-800',
  absent: 'bg-red-50 text-red-800',
  late: 'bg-amber-50 text-amber-800',
  excused: 'bg-sky-50 text-sky-700',
  early_leave: 'bg-indigo-50 text-indigo-700',
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
            .select('student_id, status')
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
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-7xl space-y-5">
              {isAdmin && belowThresholdCount > 0 && (
                <div className="bg-white rounded-xl border border-l-4 border-l-red-400 border-gray-100 px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
                      Low Attendance This Term
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold text-red-600">{belowThresholdCount}</span> student{belowThresholdCount !== 1 ? 's' : ''} below 75% attendance
                    </div>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                    Action needed
                  </span>
                </div>
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
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
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
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
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
