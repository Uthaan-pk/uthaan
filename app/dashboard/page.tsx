import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles').select('role, student_id').eq('user_id', user.id).single()
  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  if (role === 'parent') {
    const { data: link } = await supabase.from('parent_student').select('student_id').eq('parent_id', user.id).single()
    if (!link) return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><div className="text-sm font-medium text-gray-900 mb-1">No child linked yet</div>
          <div className="text-xs text-gray-400">Contact the school administrator.</div></div>
        </div>
      </div>
    )
    const { data: child } = await supabase.from('students').select('id, name, class_num, roll_no').eq('id', link.student_id).single()
    if (!child) return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex items-center justify-center"><div className="text-sm text-gray-400">Student record not found</div></div>
      </div>
    )
    const today = new Date().toISOString().split('T')[0]
    const [attRes, marksRes, assignmentsRes] = await Promise.all([
      supabase.from('attendance_logs').select('status').eq('student_id', child.id),
      supabase.from('marks').select('percent').eq('student_id', child.id),
      supabase.from('assignments').select('id, due_date').eq('class_num', child.class_num),
    ])
    const att = attRes.data ?? []
    const attRate = att.length > 0 ? Math.round((att.filter(l => l.status === 'present').length / att.length) * 100) : null
    const dueToday = (assignmentsRes.data ?? []).filter(a => a.due_date === today).length
    const marks = marksRes.data ?? []
    const avgMark = marks.length > 0 ? Math.round(marks.reduce((a, m) => a + Number(m.percent), 0) / marks.length) : null
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-3 py-1 rounded-full font-medium">{child.name}</span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <Link href="/my-child" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Attendance</div>
                <div className="text-2xl font-semibold text-gray-900">{attRate !== null ? `${attRate}%` : '—'}</div>
                <div className="text-[11px] text-gray-400 mt-1">Overall rate</div>
              </Link>
              <Link href="/marks" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Average Mark</div>
                <div className="text-2xl font-semibold text-gray-900">{avgMark !== null ? `${avgMark}%` : '—'}</div>
                <div className="text-[11px] text-gray-400 mt-1">Across all subjects</div>
              </Link>
              <Link href="/assignments" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors col-span-2">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Due Today</div>
                <div className="text-2xl font-semibold text-gray-900">{dueToday}</div>
                <div className="text-[11px] text-gray-400 mt-1">Assignments for {child.name}</div>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    const studentId = roleData?.student_id
    const today = new Date().toISOString().split('T')[0]
    let dueToday = 0, avgMark: number | null = null
    if (studentId) {
      const { data: student } = await supabase.from('students').select('class_num').eq('id', studentId).single()
      if (student?.class_num) {
        const [assignRes, marksRes] = await Promise.all([
          supabase.from('assignments').select('id, due_date').eq('class_num', student.class_num),
          supabase.from('marks').select('percent').eq('student_id', studentId),
        ])
        dueToday = (assignRes.data ?? []).filter(a => a.due_date === today).length
        const marks = marksRes.data ?? []
        avgMark = marks.length > 0 ? Math.round(marks.reduce((a, m) => a + Number(m.percent), 0) / marks.length) : null
      }
    }
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="student" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">Spring Term 2026</span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <Link href="/assignments" className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${dueToday > 0 ? 'border-l-4 border-l-amber-400 border-gray-100' : 'border-gray-100'}`}>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Due Today</div>
                <div className="text-2xl font-semibold text-gray-900">{dueToday}</div>
                <div className={`text-[11px] mt-1 font-medium ${dueToday > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{dueToday > 0 ? 'Submit now →' : 'All clear'}</div>
              </Link>
              <Link href="/marks" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">My Average</div>
                <div className="text-2xl font-semibold text-gray-900">{avgMark !== null ? `${avgMark}%` : '—'}</div>
                <div className="text-[11px] text-gray-400 mt-1">View gradebook →</div>
              </Link>
              <Link href="/timetable" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Timetable</div>
                <div className="text-sm font-medium text-gray-700 mt-2">View schedule →</div>
              </Link>
              <Link href="/quizzes" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Quizzes</div>
                <div className="text-sm font-medium text-gray-700 mt-2">Check active →</div>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Staff (teacher + admin)
  const today = new Date().toISOString().split('T')[0]
  const [studentsRes, assignmentsRes, submissionsRes, quizzesRes, announcementsRes, attendanceRes] = await Promise.all([
    supabase.from('students').select('id'),
    supabase.from('assignments').select('id, due_date'),
    supabase.from('assignment_submissions').select('id, reviewed').eq('reviewed', false),
    supabase.from('quizzes').select('id').eq('status', 'active'),
    supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('attendance_logs').select('id').eq('day', today),
  ])

  const totalStudents = (studentsRes.data ?? []).length
  const ungraded = (submissionsRes.data ?? []).length
  const dueToday = (assignmentsRes.data ?? []).filter(a => a.due_date === today).length
  const activeQuizzes = (quizzesRes.data ?? []).length
  const attendanceMarked = (attendanceRes.data ?? []).length > 0
  const recentAnnouncements = announcementsRes.data ?? []

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">Spring Term 2026</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/assignments" className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${ungraded > 0 ? 'border-l-4 border-l-amber-400 border-gray-100' : 'border-gray-100'}`}>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">To grade</div>
                <div className="text-2xl font-semibold text-gray-900">{ungraded}</div>
                <div className={`text-[11px] mt-1 font-medium ${ungraded > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{ungraded > 0 ? 'Grade now →' : 'All caught up'}</div>
              </Link>
              <Link href="/attendance" className={`bg-white rounded-xl border p-4 hover:border-gray-200 transition-colors ${!attendanceMarked ? 'border-l-4 border-l-red-400 border-gray-100' : 'border-gray-100'}`}>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Attendance</div>
                <div className="text-sm font-semibold text-gray-900 mt-1">{attendanceMarked ? 'Marked ✓' : 'Not marked today'}</div>
                <div className={`text-[11px] mt-1 font-medium ${!attendanceMarked ? 'text-red-500' : 'text-green-700'}`}>{attendanceMarked ? 'View records →' : 'Mark now →'}</div>
              </Link>
              <Link href="/assignments" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Due today</div>
                <div className="text-2xl font-semibold text-gray-900">{dueToday}</div>
                <div className="text-[11px] text-gray-400 mt-1">assignment{dueToday !== 1 ? 's' : ''} · View →</div>
              </Link>
              <Link href="/quizzes" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Live quizzes</div>
                <div className="text-2xl font-semibold text-gray-900">{activeQuizzes}</div>
                <div className="text-[11px] text-gray-400 mt-1">{activeQuizzes > 0 ? 'Students active now →' : 'None active'}</div>
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-8 flex-wrap">
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Total students</div>
                <div className="text-xl font-semibold text-gray-900 mt-0.5">{totalStudents}</div>
              </div>
              <div className="w-px h-8 bg-gray-100 hidden sm:block"/>
              <Link href="/announcements" className="text-[11px] font-medium text-[#1a2e1a] hover:underline">Post announcement →</Link>
              <Link href="/students" className="text-[11px] font-medium text-[#1a2e1a] hover:underline sm:ml-auto">View all students →</Link>
            </div>

            {recentAnnouncements.length > 0 && (
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-3">Recent announcements</div>
                <div className="space-y-2">
                  {recentAnnouncements.map(a => (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] flex-shrink-0"/>
                      <div className="text-sm text-gray-900 flex-1">{a.title}</div>
                      <div className="text-[11px] text-gray-400 flex-shrink-0">{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
