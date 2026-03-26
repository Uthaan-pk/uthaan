import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import StatCard from './StatCard'

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

  // ── Parent dashboard ──────────────────────────────────────────────────────
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
              <div className="text-sm font-medium text-gray-900 mb-1">No child linked to your account</div>
              <div className="text-xs text-gray-400">Contact the school administrator to link your child.</div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num, roll_no, stage')
      .eq('id', link.student_id)
      .single()


    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">Student record not found</div>
              <div className="text-xs text-gray-400">Contact the school administrator.</div>
            </div>
          </div>
        </div>
      )
    }

    const [attRes, marksRes, completionsRes, assignmentsRes, announcementsRes] = await Promise.all([
      supabase.from('attendance_logs').select('status').eq('student_id', child.id),
      supabase.from('marks').select('percent').eq('student_id', child.id),
      supabase.from('assignment_completions').select('assignment_id').eq('student_id', child.id),
      supabase.from('assignments').select('id, due_date').eq('class_num', child.class_num),
      supabase
        .from('announcements')
        .select('id, title, priority, created_at')
        .or(`class_num.eq.${child.class_num},class_num.is.null`)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const att = attRes.data ?? []
    const presentCount = att.filter(l => l.status === 'present').length
    const attRate = att.length > 0 ? Math.round((presentCount / att.length) * 100) : null

    const percents = (marksRes.data ?? []).map(m => m.percent ?? 0)
    const avgMarks = percents.length > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null

    const doneIds = new Set((completionsRes.data ?? []).map(c => c.assignment_id))
    const today = new Date().toISOString().split('T')[0]
    const pendingCount = (assignmentsRes.data ?? []).filter(a => !doneIds.has(a.id) && a.due_date >= today).length

    const announcements = announcementsRes.data ?? []

    const priorityBadge: Record<string, string> = {
      important: 'bg-amber-50 text-amber-800',
      urgent: 'bg-red-50 text-red-700',
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Parent Dashboard</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              {child.name} · Class {child.class_num}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Attendance"
                  value={attRate !== null ? `${attRate}%` : '—'}
                  change={`${presentCount}/${att.length} days`}
                  icon="📋"
                  color={attRate !== null && attRate < 75 ? 'red' : 'green'}
                  href="/attendance"
                />
                <StatCard
                  label="Avg marks"
                  value={avgMarks !== null ? `${avgMarks}%` : '—'}
                  change="All subjects"
                  icon="📊"
                  color="blue"
                  href="/marks"
                />
                <StatCard
                  label="Pending homework"
                  value={pendingCount}
                  change="Due upcoming"
                  icon="📚"
                  color="amber"
                  href="/homework"
                />
                <StatCard
                  label="Class"
                  value={`Class ${child.class_num}`}
                  change={child.stage ?? child.roll_no ?? ''}
                  icon="🏫"
                  color="purple"
                  href="/my-child"
                />
              </div>

              {/* Recent announcements */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Recent announcements</h2>
                </div>
                {announcements.length > 0 ? announcements.map((a: any) => (
                  <div key={a.id} className="px-5 py-3.5 border-b border-gray-50 last:border-0">
                    {a.priority !== 'normal' && (
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1 ${priorityBadge[a.priority] ?? 'bg-gray-50 text-gray-600'}`}>
                        {a.priority.charAt(0).toUpperCase() + a.priority.slice(1)}
                      </span>
                    )}
                    <div className="text-sm font-medium text-gray-900">{a.title}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No announcements</div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ── Staff / student dashboard ─────────────────────────────────────────────
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
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total students" value={studentCount ?? 0} change="Enrolled this term" icon="👥" color="green" href={role === 'student' ? '/dashboard' : '/students'} />
            <StatCard label="Attendance today" value="—" change="Mark to see rate" icon="📋" color="blue" href="/attendance" />
            <StatCard label="Active quizzes" value={quizCount ?? 0} change="Assigned & pending" icon="📝" color="amber" href="/quizzes" />
            <StatCard label="Notes sent" value={noteCount ?? 0} change="All time" icon="📢" color="purple" href="/notes" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
