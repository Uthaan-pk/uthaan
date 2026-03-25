import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import MarksEditor from './MarksEditor'

export default async function MarksPage() {
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

  if (isStaff) {
    const { data: students } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .order('name')

    const { data: marksData } = await supabase
      .from('marks')
      .select('student_id, subject, exam, percent')

    // allMarks[exam][student_id][subject] = percent
    const allMarks: Record<string, Record<string, Record<string, number | null>>> = {}
    marksData?.forEach(m => {
      if (!allMarks[m.exam]) allMarks[m.exam] = {}
      if (!allMarks[m.exam][m.student_id]) allMarks[m.exam][m.student_id] = {}
      allMarks[m.exam][m.student_id][m.subject] = m.percent
    })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Marks</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <MarksEditor students={students ?? []} allMarks={allMarks} />
          </main>
        </div>
      </div>
    )
  }

  // Student view
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

  const { data: marks } = await supabase
    .from('marks')
    .select('subject, exam, percent')
    .eq('student_id', student.id)
    .order('exam')
    .order('subject')

  // Group by exam for display
  const byExam: Record<string, { subject: string; percent: number }[]> = {}
  marks?.forEach(m => {
    if (!byExam[m.exam]) byExam[m.exam] = []
    byExam[m.exam].push({ subject: m.subject, percent: m.percent ?? 0 })
  })

  const allPercents = marks?.map(m => m.percent ?? 0) ?? []
  const avg = allPercents.length > 0
    ? Math.round(allPercents.reduce((a, b) => a + b, 0) / allPercents.length)
    : 0

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">My Marks</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-sm mb-3">📊</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Overall average</div>
                <div className="text-2xl font-semibold text-gray-900">{avg}%</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-sm mb-3">📚</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Exams recorded</div>
                <div className="text-2xl font-semibold text-gray-900">{Object.keys(byExam).length}</div>
              </div>
            </div>

            {Object.keys(byExam).length > 0 ? Object.entries(byExam).map(([exam, subjects]) => (
              <div key={exam} className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{exam}</h2>
                  <span className="text-[11px] text-gray-400">
                    Avg {Math.round(subjects.reduce((a, s) => a + s.percent, 0) / subjects.length)}%
                  </span>
                </div>
                {subjects.map((s, i) => (
                  <div
                    key={s.subject}
                    className={`px-5 py-3.5 flex items-center justify-between ${i < subjects.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <span className="text-sm font-medium text-gray-900 capitalize">{s.subject}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#6fcf6f] rounded-full" style={{ width: `${s.percent}%` }} />
                      </div>
                      <span className={`text-sm font-semibold w-10 text-right ${s.percent >= 60 ? 'text-green-700' : 'text-red-600'}`}>
                        {s.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )) : (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-10 text-center text-sm text-gray-400">
                No marks recorded yet
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
