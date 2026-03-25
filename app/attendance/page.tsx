import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AttendanceMarker from './AttendanceMarker'

const statusStyles: Record<string, string> = {
  present: 'bg-green-50 text-green-800',
  absent: 'bg-red-50 text-red-800',
  late: 'bg-amber-50 text-amber-800',
}

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  if (isStaff) {
    const { data: students } = await supabase
      .from('students')
      .select('id, name, roll_no, stage, class_num')
      .order('name')

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('student_id, status')
      .eq('day', today)

    const initialStatus: Record<string, 'present' | 'absent'> = {}
    logs?.forEach(log => { initialStatus[log.student_id] = log.status as 'present' | 'absent' })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Attendance</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <AttendanceMarker
                students={students ?? []}
                initialStatus={initialStatus}
                today={today}
              />
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Student view — link user to student via user_id column
  const { data: student } = await supabase
    .from('students')
    .select('id, name, roll_no')
    .eq('user_id', user.id)
    .single()

  if (!student) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">No student record found</div>
            <div className="text-xs text-gray-400">Your account is not linked to a student. Contact your administrator.</div>
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
  const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">My Attendance</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Days present" value={presentDays} icon="✅" color="green" />
              <StatCard label="Days absent" value={totalDays - presentDays} icon="❌" color="red" />
              <StatCard label="Attendance rate" value={`${rate}%`} icon="📊" color="blue" />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Attendance history</h2>
              </div>
              {logs && logs.length > 0 ? logs.map((log, i) => (
                <div
                  key={log.day}
                  className={`px-5 py-3.5 flex items-center justify-between ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <span className="text-sm text-gray-700">
                    {new Date(log.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                  <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full capitalize ${statusStyles[log.status] ?? 'bg-gray-50 text-gray-600'}`}>
                    {log.status}
                  </span>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-gray-400">No attendance records yet</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  const iconBg: Record<string, string> = { green: 'bg-green-50', red: 'bg-red-50', blue: 'bg-blue-50' }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-8 h-8 ${iconBg[color]} rounded-lg flex items-center justify-center text-sm mb-3`}>{icon}</div>
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}
