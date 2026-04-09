import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import { fmtSubject } from '@/lib/gradeUtils'
import { CURRENT_TERM } from '@/lib/constants'

type StudentRow = { id: string; name: string; class_num: number | null }
type MarkRow = { student_id: string; subject: string; percent: number | null }

type SubjectCard = {
  key: string
  subject: string
  displaySubject: string
  classNum: number
  avg: number
  highest: number
  lowest: number
  passRate: number
  top3: { name: string; score: number }[]
  bottom3: { name: string; score: number }[]
}

export default async function AnalyticsPage() {
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

  if (effectiveRole !== 'teacher' && effectiveRole !== 'admin') {
    redirect('/dashboard')
  }

  const [studentsRes, marksRes, timetableRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, class_num')
      .eq('is_active', true),
    supabase.from('marks').select('student_id, subject, percent'),
    effectiveRole === 'teacher'
      ? supabase
          .from('timetable')
          .select('class_num, subject')
          .eq('teacher_id', user.id)
          .limit(500)
      : Promise.resolve({ data: null }),
  ])

  const students: StudentRow[] = studentsRes.data ?? []
  const marks: MarkRow[] = marksRes.data ?? []

  // Build teacher visibility filter (class_num+subject combos)
  type TeacherSlot = { class_num: number; subject: string }
  const teacherSlots: TeacherSlot[] | null =
    effectiveRole === 'teacher' && timetableRes.data
      ? (timetableRes.data as TeacherSlot[])
      : null
  const teacherVisibleKeys: Set<string> | null = teacherSlots
    ? new Set(teacherSlots.map((r) => `${r.class_num}__${String(r.subject).toLowerCase()}`))
    : null

  // Build studentId → student map
  const studentMap = new Map<string, StudentRow>()
  for (const s of students) studentMap.set(s.id, s)

  // Compute per-student per-subject average score
  // key: `${class_num}__${subject}`
  const groupData = new Map<
    string,
    { classNum: number; subject: string; scores: { studentId: string; score: number }[] }
  >()

  // First aggregate marks per student per subject
  const studentSubjectScores = new Map<string, number[]>() // key: `${studentId}__${subject}`
  for (const m of marks) {
    if (m.percent == null) continue
    const k = `${m.student_id}__${m.subject.toLowerCase()}`
    if (!studentSubjectScores.has(k)) studentSubjectScores.set(k, [])
    studentSubjectScores.get(k)!.push(m.percent)
  }

  // Average per student per subject, then group by class+subject
  for (const [key, scores] of studentSubjectScores.entries()) {
    const [studentId, subject] = key.split('__')
    const student = studentMap.get(studentId)
    if (!student || student.class_num == null) continue

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const groupKey = `${student.class_num}__${subject}`

    if (!groupData.has(groupKey)) {
      groupData.set(groupKey, { classNum: student.class_num, subject, scores: [] })
    }
    groupData.get(groupKey)!.scores.push({ studentId, score: Math.round(avg * 10) / 10 })
  }

  // Compute stats for each group
  const cards: SubjectCard[] = []
  for (const [groupKey, group] of groupData.entries()) {
    // Teachers only see their own class+subject combos
    if (teacherVisibleKeys && !teacherVisibleKeys.has(groupKey)) continue
    if (group.scores.length === 0) continue

    const vals = group.scores.map((s) => s.score)
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    const highest = Math.max(...vals)
    const lowest = Math.min(...vals)
    const passing = vals.filter((v) => v >= 50).length
    const passRate = Math.round((passing / vals.length) * 100)

    const sorted = [...group.scores].sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3).map((s) => ({
      name: studentMap.get(s.studentId)?.name ?? s.studentId,
      score: s.score,
    }))
    const bottom3 = sorted
      .slice(-3)
      .reverse()
      .map((s) => ({
        name: studentMap.get(s.studentId)?.name ?? s.studentId,
        score: s.score,
      }))

    cards.push({
      key: `${group.classNum}__${group.subject}`,
      subject: group.subject,
      displaySubject: fmtSubject(group.subject),
      classNum: group.classNum,
      avg,
      highest,
      lowest,
      passRate,
      top3,
      bottom3,
    })
  }

  // Sort by class then subject
  cards.sort((a, b) =>
    a.classNum !== b.classNum
      ? a.classNum - b.classNum
      : a.subject.localeCompare(b.subject)
  )

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Analytics</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {CURRENT_TERM}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {cards.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900 mb-1">No marks data yet</div>
                <div className="text-xs text-gray-400">Enter marks to see analytics here.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
              {cards.map((card) => (
                <div
                  key={card.key}
                  className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {card.displaySubject}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Class {card.classNum}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#1a2e1a]">{card.avg}%</div>
                      <div className="text-[10px] text-gray-400">class avg</div>
                    </div>
                  </div>

                  {/* Pass rate bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] text-gray-400">Pass rate</span>
                      <span
                        className={`text-[11px] font-medium ${
                          card.passRate >= 75
                            ? 'text-green-700'
                            : card.passRate >= 50
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {card.passRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          card.passRate >= 75
                            ? 'bg-green-500'
                            : card.passRate >= 50
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        }`}
                        style={{ width: `${card.passRate}%` }}
                      />
                    </div>
                  </div>

                  {/* High / Low */}
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Highest </span>
                      <span className="font-medium text-green-700">{card.highest}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Lowest </span>
                      <span className="font-medium text-red-500">{card.lowest}%</span>
                    </div>
                  </div>

                  {/* Top 3 / Bottom 3 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                        Top 3
                      </div>
                      <ol className="space-y-1">
                        {card.top3.map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[10px] text-gray-300 w-3 flex-shrink-0">
                              {i + 1}.
                            </span>
                            <span className="text-gray-700 truncate flex-1">{s.name}</span>
                            <span className="text-green-700 font-medium flex-shrink-0">
                              {s.score}%
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                        Bottom 3
                      </div>
                      <ol className="space-y-1">
                        {card.bottom3.map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[10px] text-gray-300 w-3 flex-shrink-0">
                              {i + 1}.
                            </span>
                            <span className="text-gray-700 truncate flex-1">{s.name}</span>
                            <span className="text-red-500 font-medium flex-shrink-0">
                              {s.score}%
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
