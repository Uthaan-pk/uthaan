import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-50 text-blue-700 border-blue-100',
  english: 'bg-purple-50 text-purple-700 border-purple-100',
  urdu: 'bg-orange-50 text-orange-700 border-orange-100',
  science: 'bg-teal-50 text-teal-700 border-teal-100',
  islamiat: 'bg-amber-50 text-amber-700 border-amber-100',
  social: 'bg-pink-50 text-pink-700 border-pink-100',
  history: 'bg-rose-50 text-rose-700 border-rose-100',
  computer: 'bg-sky-50 text-sky-700 border-sky-100',
}
function subjectColor(s: string) {
  return SUBJECT_COLORS[s.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-100'
}

const statusStyles: Record<string, string> = {
  present: 'bg-green-50 text-green-700',
  absent: 'bg-red-50 text-red-600',
  late: 'bg-amber-50 text-amber-600',
  excused: 'bg-sky-50 text-sky-700',
  early_leave: 'bg-indigo-50 text-indigo-700',
}

export default async function MyChildPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  if (role !== 'parent') redirect('/dashboard')

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
    .select('id, name, roll_no, class_num, stage, email')
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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [marksRes, attRes, assignmentsRes, completionsRes] = await Promise.all([
    supabase
      .from('marks')
      .select('subject, exam, percent')
      .eq('student_id', child.id)
      .order('exam')
      .order('subject')
      .limit(10),
    supabase
      .from('attendance_logs')
      .select('day, status')
      .eq('student_id', child.id)
      .gte('day', sevenDaysAgoStr)
      .order('day', { ascending: false }),
    supabase
      .from('assignments')
      .select('id, title, subject, due_date')
      .eq('class_num', child.class_num)
      .gte('due_date', today)
      .lte('due_date', sevenDaysLaterStr)
      .order('due_date', { ascending: true }),
    supabase
      .from('assignment_completions')
      .select('assignment_id')
      .eq('student_id', child.id),
  ])

  const marks = marksRes.data ?? []
  const attLogs = attRes.data ?? []
  const assignments = assignmentsRes.data ?? []
  const doneIds = new Set((completionsRes.data ?? []).map(c => c.assignment_id))
  const pendingAssignments = assignments.filter(a => !doneIds.has(a.id))

  const allAttRes = await supabase
    .from('attendance_logs')
    .select('status')
    .eq('student_id', child.id)

  const allAtt = allAttRes.data ?? []
  const presentCount = allAtt.filter(l => l.status === 'present').length
  const attRate = allAtt.length > 0 ? Math.round((presentCount / allAtt.length) * 100) : null

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="parent" />

      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">My Child</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Viewing as: {child.name}
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-3xl space-y-6">

            {/* Student info card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Student profile</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoField label="Name" value={child.name} />
                <InfoField label="Roll No" value={child.roll_no} />
                <InfoField label="Class" value={`${child.class_num}${child.stage ? ` · ${child.stage}` : ''}`} />
                <InfoField label="Email" value={child.email ?? '—'} />
              </div>
              {attRate !== null && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide">Overall attendance</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${attRate >= 75 ? 'bg-[#6fcf6f]' : 'bg-red-400'}`}
                          style={{ width: `${attRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${attRate >= 75 ? 'text-green-700' : 'text-red-600'}`}>
                        {attRate}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Recent marks */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Recent marks</h2>
                </div>
                {marks.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No marks recorded</div>
                ) : (
                  marks.slice(0, 5).map((m, i) => (
                    <div key={i} className={`px-5 py-3 flex items-center justify-between ${i < Math.min(marks.length, 5) - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border mr-2 ${subjectColor(m.subject)}`}>
                          {m.subject.charAt(0).toUpperCase() + m.subject.slice(1)}
                        </span>
                        <span className="text-xs text-gray-400">{m.exam}</span>
                      </div>
                      <span className={`text-sm font-semibold ${m.percent >= 60 ? 'text-green-700' : 'text-red-600'}`}>
                        {m.percent}%
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Recent attendance */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Attendance (last 7 days)</h2>
                </div>
                {attLogs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No records this week</div>
                ) : (
                  attLogs.map((log, i) => (
                    <div key={log.day} className={`px-5 py-3 flex items-center justify-between ${i < attLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <span className="text-sm text-gray-700">
                        {new Date(log.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full capitalize ${statusStyles[log.status] ?? 'bg-gray-50 text-gray-600'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Upcoming homework */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Upcoming homework (next 7 days)</h2>
              </div>
              {pendingAssignments.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No upcoming homework</div>
              ) : (
                pendingAssignments.map((a, i) => (
                  <div key={a.id} className={`px-5 py-3.5 flex items-center justify-between gap-4 ${i < pendingAssignments.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="min-w-0">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border mr-2 ${subjectColor(a.subject)}`}>
                        {a.subject.charAt(0).toUpperCase() + a.subject.slice(1)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{a.title}</span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      Due {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
    </div>
  )
}
