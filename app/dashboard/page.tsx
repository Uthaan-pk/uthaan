import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: attendance } = await supabase
    .from('attendance_logs')
    .select('*, students(name, roll_no, stage, class_num)')
    .eq('day', new Date().toISOString().split('T')[0])
    .limit(4)

  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  const { count: quizCount } = await supabase
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'assigned')

  const { count: noteCount } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })

  const audienceStyles: Record<string, string> = {
    all: 'bg-green-50 text-green-800',
    stage: 'bg-blue-50 text-blue-800',
    class: 'bg-amber-50 text-amber-800',
    student: 'bg-purple-50 text-purple-800',
  }

  const audienceLabels: Record<string, string> = {
    all: 'All students',
    stage: 'Stage',
    class: 'Class',
    student: 'Individual',
  }

  const statusStyles: Record<string, string> = {
    present: 'bg-green-50 text-green-800',
    absent: 'bg-red-50 text-red-800',
    late: 'bg-amber-50 text-amber-800',
  }

  const getInitials = (name: string) =>
    name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const getHour = () => {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">

      <Sidebar email={user.email!} role={role ?? ''} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">
            Good {getHour()}, <span className="capitalize">{role}</span> 👋
          </h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total students" value={studentCount ?? 0} change="Enrolled this term" icon="👥" color="green" />
            <StatCard label="Attendance today" value="—" change="Mark to see rate" icon="📋" color="blue" />
            <StatCard label="Active quizzes" value={quizCount ?? 0} change="Assigned & pending" icon="📝" color="amber" />
            <StatCard label="Notes sent" value={noteCount ?? 0} change="All time" icon="📢" color="purple" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4">

            {/* Notes feed */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recent notes</h2>
                <span className="text-xs text-green-600 cursor-pointer">View all →</span>
              </div>
              {notes && notes.length > 0 ? notes.map((note: any) => (
                <div key={note.id} className="px-5 py-3.5 border-b border-gray-50 last:border-0">
                  <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1.5 ${audienceStyles[note.audience]}`}>
                    {audienceLabels[note.audience]}
                  </span>
                  <div className="text-sm font-medium text-gray-900">{note.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{note.body}</div>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No notes yet</div>
              )}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Today's attendance</h2>
                <span className="text-xs text-green-600 cursor-pointer">Mark attendance →</span>
              </div>
              {attendance && attendance.length > 0 ? attendance.map((log: any) => (
                <div key={log.id} className="px-5 py-3 border-b border-gray-50 last:border-0 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                    {getInitials(log.students?.name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900">{log.students?.name}</div>
                    <div className="text-[10px] text-gray-400">{log.students?.roll_no}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full capitalize ${statusStyles[log.status]}`}>
                    {log.status}
                  </span>
                </div>
              )) : (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No attendance recorded today</div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}


function StatCard({ label, value, change, icon, color }: {
  label: string; value: number | string; change: string; icon: string; color: string
}) {
  const iconBg: Record<string, string> = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    purple: 'bg-purple-50',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-8 h-8 ${iconBg[color]} rounded-lg flex items-center justify-center text-sm mb-3`}>{icon}</div>
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-[11px] text-green-700 mt-1">{change}</div>
    </div>
  )
}