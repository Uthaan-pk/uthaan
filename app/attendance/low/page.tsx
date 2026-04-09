import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import { buildAttendanceMap } from '@/lib/attendanceLeaves'
import { CURRENT_TERM, TERM_START_DATE } from '@/lib/constants'

export default async function LowAttendancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)

  if (effectiveRole !== 'admin') {
    redirect('/dashboard')
  }

  const [studentsRes, attLogsRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, class_num, roll_no')
      .eq('is_active', true)
      .order('class_num', { ascending: true }),
    supabase
      .from('attendance_logs')
      .select('student_id, status')
      .gte('day', TERM_START_DATE),
  ])

  const students = studentsRes.data ?? []
  const attMap = buildAttendanceMap(attLogsRes.data ?? [])

  const lowStudents = students.filter((s) => {
    const pct = attMap[s.id]
    // Include students with attendance recorded and below 75%
    // Also include students with no records (null) as they have 0% effective attendance
    return pct === null || pct < 75
  })

  const lowStudentIds = lowStudents.map((s) => s.id)

  // Fetch parent links for the low-attendance students
  const { data: parentLinks } = lowStudentIds.length > 0
    ? await supabase
        .from('parent_student')
        .select('student_id, parent_name, parent_email')
        .in('student_id', lowStudentIds)
    : { data: [] }

  // Build a map of student_id → parent info
  const parentMap = new Map<string, { name: string | null; email: string | null }>()
  for (const link of parentLinks ?? []) {
    parentMap.set(link.student_id, {
      name: link.parent_name ?? null,
      email: link.parent_email ?? null,
    })
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar
        email={user.email!}
        role="admin"
        isImpersonating={role === 'superadmin'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/attendance"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Attendance
            </Link>
            <span className="text-gray-200">/</span>
            <h1 className="text-sm font-semibold text-gray-900">Below 75% Attendance</h1>
          </div>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {CURRENT_TERM}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-amber-600 text-sm font-medium">
                {lowStudents.length} student{lowStudents.length !== 1 ? 's' : ''} below 75% attendance this term
              </span>
            </div>

            {lowStudents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
                <div className="text-sm font-medium text-gray-900 mb-1">All students above threshold</div>
                <div className="text-xs text-gray-400">No students below 75% attendance this term.</div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        Student
                      </th>
                      <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        Class
                      </th>
                      <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        Attendance
                      </th>
                      <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        Parent
                      </th>
                      <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStudents.map((student, i) => {
                      const pct = attMap[student.id]
                      const parent = parentMap.get(student.id)
                      const isLast = i === lowStudents.length - 1

                      return (
                        <tr
                          key={student.id}
                          className={!isLast ? 'border-b border-gray-50' : ''}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-[11px] text-gray-400">{student.roll_no}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {student.class_num != null ? `Class ${student.class_num}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                pct === null
                                  ? 'bg-gray-100 text-gray-500'
                                  : pct < 50
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {pct === null ? 'No records' : `${pct}%`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {parent?.name ? (
                              <span className="text-gray-700">{parent.name}</span>
                            ) : (
                              <span className="text-xs text-gray-400">No parent linked</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {parent?.email ? (
                              <a
                                href={`mailto:${parent.email}`}
                                className="text-xs text-[#1a2e1a] underline underline-offset-2"
                              >
                                {parent.email}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
