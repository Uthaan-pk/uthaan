import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/Sidebar'
import ParentLinker from './ParentLinker'

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(new Date().setDate(diff)).toISOString().split('T')[0]
}

function getThirtyDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/dashboard')

  const monday = getMonday()
  const thirtyDaysAgo = getThirtyDaysAgo()

  // Parallel fetches
  const [
    teacherCountRes,
    studentCountRes,
    parentLinksRes,
    weekLogsRes,
    teachersRes,
    quizzesRes,
    assignActivityRes,
    studentsRes,
    allLogsRes,
    recentLogsRes,
    allMarksRes,
    allCompletionsRes,
    allAssignmentsRes,
  ] = await Promise.all([
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('parent_student').select('id, parent_id, student_id'),
    supabase.from('attendance_logs').select('status').gte('day', monday),
    supabase.from('user_roles').select('user_id').in('role', ['teacher', 'admin']),
    supabase.from('quizzes').select('created_by'),
    supabase.from('assignments').select('created_by'),
    supabase.from('students').select('id, name, roll_no, class_num, stage').order('name'),
    supabase.from('attendance_logs').select('student_id, status'),
    supabase.from('attendance_logs').select('student_id, status').gte('day', thirtyDaysAgo),
    supabase.from('marks').select('student_id, percent'),
    supabase.from('assignment_completions').select('student_id'),
    supabase.from('assignments').select('class_num'),
  ])

  const teacherCount = teacherCountRes.count ?? 0
  const studentCount = studentCountRes.count ?? 0
  const rawLinks = parentLinksRes.data ?? []

  console.log('[admin] parentLinksRes.data:', parentLinksRes.data)
  console.log('[admin] parentLinksRes.error:', parentLinksRes.error)
  console.log('[admin] rawLinks count:', rawLinks.length)
  const weekLogs = weekLogsRes.data ?? []
  const teachers = teachersRes.data ?? []
  const quizzes = quizzesRes.data ?? []
  const assignActivity = assignActivityRes.data ?? []
  const students = studentsRes.data ?? []
  const allLogs = allLogsRes.data ?? []
  const recentLogs = recentLogsRes.data ?? []
  const allMarks = allMarksRes.data ?? []
  const allCompletions = allCompletionsRes.data ?? []
  const allAssignments = allAssignmentsRes.data ?? []

  // ── Parent links ──────────────────────────────────────────────────────────
  // Look up parent emails via the admin client (bypasses RLS on auth.users)
  const studentById = Object.fromEntries(
    (studentsRes.data ?? []).map(s => [s.id, s])
  )

  let emailById: Record<string, string> = {}
  if (rawLinks.length > 0) {
    const adminClient = createAdminClient()
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    console.log('[admin] listUsers error:', usersError)
    console.log('[admin] listUsers count:', users?.length)
    emailById = Object.fromEntries(users.map(u => [u.id, u.email ?? '—']))
  }

  console.log('[admin] parentLinks to render:', parentLinksRes.data?.map(l => ({
    id: (l as any).id,
    parent_id: (l as any).parent_id,
    student_id: (l as any).student_id,
    resolved_email: emailById[(l as any).parent_id] ?? 'NOT FOUND',
    resolved_student: studentById[(l as any).student_id]?.name ?? 'NOT FOUND',
  })))

  const parentLinks = rawLinks.map((l: any) => ({
    id: l.id as string,
    parent_id: l.parent_id as string,
    parent_email: emailById[l.parent_id] ?? `···${(l.parent_id as string).slice(-8)}`,
    student_name: studentById[l.student_id]?.name ?? '—',
    student_roll: studentById[l.student_id]?.roll_no ?? '—',
  }))

  // ── Stats ─────────────────────────────────────────────────────────────────

  const weekTotal = weekLogs.length
  const weekPresent = weekLogs.filter(l => l.status === 'present').length
  const weekRate = weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : null

  // ── Teacher activity ──────────────────────────────────────────────────────

  const quizByTeacher: Record<string, number> = {}
  quizzes.forEach(q => {
    if (q.created_by) quizByTeacher[q.created_by] = (quizByTeacher[q.created_by] ?? 0) + 1
  })

  const assignByTeacher: Record<string, number> = {}
  assignActivity.forEach(a => {
    if (a.created_by) assignByTeacher[a.created_by] = (assignByTeacher[a.created_by] ?? 0) + 1
  })

  const teacherActivity = teachers
    .map(t => ({
      user_id: t.user_id,
      quizzes: quizByTeacher[t.user_id] ?? 0,
      assignments: assignByTeacher[t.user_id] ?? 0,
      total: (quizByTeacher[t.user_id] ?? 0) + (assignByTeacher[t.user_id] ?? 0),
    }))
    .sort((a, b) => b.total - a.total)

  const mostActive = teacherActivity[0]

  // ── At-risk students (< 75% in last 30 days) ──────────────────────────────

  const recentAttByStudent: Record<string, { present: number; total: number }> = {}
  recentLogs.forEach(log => {
    if (!recentAttByStudent[log.student_id]) recentAttByStudent[log.student_id] = { present: 0, total: 0 }
    recentAttByStudent[log.student_id].total++
    if (log.status === 'present') recentAttByStudent[log.student_id].present++
  })

  const atRisk = students
    .filter(s => {
      const rec = recentAttByStudent[s.id]
      return rec && rec.total >= 3 && (rec.present / rec.total) * 100 < 75
    })
    .map(s => ({
      ...s,
      rate: Math.round((recentAttByStudent[s.id].present / recentAttByStudent[s.id].total) * 100),
      days: recentAttByStudent[s.id].total,
    }))
    .sort((a, b) => a.rate - b.rate)

  // ── Student performance ───────────────────────────────────────────────────

  const allAttByStudent: Record<string, { present: number; total: number }> = {}
  allLogs.forEach(log => {
    if (!allAttByStudent[log.student_id]) allAttByStudent[log.student_id] = { present: 0, total: 0 }
    allAttByStudent[log.student_id].total++
    if (log.status === 'present') allAttByStudent[log.student_id].present++
  })

  const marksByStudent: Record<string, number[]> = {}
  allMarks.forEach(m => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = []
    marksByStudent[m.student_id].push(m.percent ?? 0)
  })

  const completionsByStudent: Record<string, number> = {}
  allCompletions.forEach(c => {
    completionsByStudent[c.student_id] = (completionsByStudent[c.student_id] ?? 0) + 1
  })

  const totalAssignsByClass: Record<number, number> = {}
  allAssignments.forEach(a => {
    if (a.class_num != null) {
      totalAssignsByClass[a.class_num] = (totalAssignsByClass[a.class_num] ?? 0) + 1
    }
  })

  const studentPerf = students.map(s => {
    const att = allAttByStudent[s.id]
    const attRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null
    const marks = marksByStudent[s.id] ?? []
    const avgMarks = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null
    const done = completionsByStudent[s.id] ?? 0
    const total = totalAssignsByClass[s.class_num] ?? 0
    const assignPct = total > 0 ? Math.round((done / total) * 100) : null
    return { ...s, attRate, avgMarks, assignPct }
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Admin Overview</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="👨‍🏫" label="Teachers" value={teacherCount} color="green" />
            <StatCard icon="👥" label="Students" value={studentCount} color="blue" />
            <StatCard
              icon="📋"
              label="Attendance this week"
              value={weekRate !== null ? `${weekRate}%` : '—'}
              sub={weekTotal > 0 ? `${weekPresent}/${weekTotal} records` : 'No records yet'}
              color="amber"
            />
            <StatCard
              icon="🏆"
              label="Most active teacher"
              value={mostActive && mostActive.total > 0 ? `···${mostActive.user_id.slice(-6)}` : '—'}
              sub={mostActive && mostActive.total > 0 ? `${mostActive.total} activities` : 'No activity yet'}
              color="purple"
            />
          </div>

          {/* At-risk students */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-900">At-risk students</h2>
              <span className="text-[11px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-medium">
                &lt;75% in last 30 days
              </span>
              {atRisk.length > 0 && (
                <span className="text-[11px] text-gray-400">{atRisk.length} student{atRisk.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {atRisk.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-8 text-center">
                <p className="text-sm text-[#6fcf6f] font-medium">All clear</p>
                <p className="text-xs text-gray-400 mt-1">No students below 75% attendance in the last 30 days</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Name</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Roll No</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Class</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Attendance (30d)</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Days recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.map((s, i) => (
                        <tr key={s.id} className={i < atRisk.length - 1 ? 'border-b border-gray-50' : ''}>
                          <td className="px-5 py-3.5 font-medium text-gray-900">{s.name}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{s.roll_no}</td>
                          <td className="px-5 py-3.5 text-gray-500">{s.class_num}{s.stage ? ` · ${s.stage}` : ''}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${s.rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-red-600">{s.rate}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">{s.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Teacher activity */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Teacher activity</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {teacherActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No teachers found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Teacher</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Quizzes</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Assignments</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherActivity.map((t, i) => (
                        <tr key={t.user_id} className={i < teacherActivity.length - 1 ? 'border-b border-gray-50' : ''}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#6fcf6f]/15 flex items-center justify-center text-[#6fcf6f] text-[10px] font-bold flex-shrink-0">
                                T
                              </div>
                              <span className="font-mono text-xs text-gray-700">···{t.user_id.slice(-8)}</span>
                              {i === 0 && t.total > 0 && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium">Top</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-700">{t.quizzes}</td>
                          <td className="px-5 py-3.5 text-gray-700">{t.assignments}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-sm font-semibold ${t.total > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                              {t.total}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Parent portal */}
          <ParentLinker students={students} initialLinks={parentLinks} />

          {/* Student performance */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Student performance</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {studentPerf.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No students found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Student</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Class</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Attendance</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Avg Marks</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Homework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerf.map((s, i) => (
                        <tr key={s.id} className={i < studentPerf.length - 1 ? 'border-b border-gray-50' : ''}>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-gray-900">{s.name}</div>
                            <div className="text-[11px] text-gray-400">{s.roll_no}</div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">{s.class_num}</td>
                          <td className="px-5 py-3.5">
                            {s.attRate !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-14 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${s.attRate >= 75 ? 'bg-[#6fcf6f]' : 'bg-red-400'}`}
                                    style={{ width: `${s.attRate}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-semibold ${s.attRate >= 75 ? 'text-green-700' : 'text-red-600'}`}>
                                  {s.attRate}%
                                </span>
                              </div>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            {s.avgMarks !== null ? (
                              <span className={`text-xs font-semibold ${s.avgMarks >= 60 ? 'text-green-700' : 'text-red-600'}`}>
                                {s.avgMarks}%
                              </span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            {s.assignPct !== null ? (
                              <span className="text-xs font-semibold text-gray-700">{s.assignPct}%</span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string
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
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}
