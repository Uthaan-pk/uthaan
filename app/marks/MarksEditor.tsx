'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { calculateGrade, type GradeWeights, type GradeResult } from '@/lib/calculateGrade'

type Student = { id: string; name: string; roll_no: string; user_id?: string | null }
// allMarks[exam][student_id][subject] = percent
type AllMarksData = Record<string, Record<string, Record<string, number | null>>>
// marksState[exam][student_id][subject] = string input value
type MarksState = Record<string, Record<string, Record<string, string>>>

const SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat']
const EXAMS = ['Mid Term', 'Final Term', 'Unit Test'] as const
type Exam = typeof EXAMS[number]

const LETTER_COLOR: Record<string, string> = {
  'A+': 'text-[#1a2e1a] bg-[#6fcf6f]/20 border-[#6fcf6f]/30',
  'A':  'text-green-800 bg-green-50 border-green-100',
  'B':  'text-blue-800  bg-blue-50  border-blue-100',
  'C':  'text-amber-800 bg-amber-50 border-amber-100',
  'D':  'text-orange-800 bg-orange-50 border-orange-100',
  'F':  'text-red-800   bg-red-50   border-red-100',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avgOf(values: (string | undefined)[]): number | null {
  const nums = values.map(v => Number(v)).filter(n => !isNaN(n) && n > 0)
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

function buildInitialState(students: Student[], allMarks: AllMarksData): MarksState {
  const state: MarksState = {}
  for (const exam of EXAMS) {
    state[exam] = {}
    for (const s of students) {
      state[exam][s.id] = {}
      for (const sub of SUBJECTS) {
        const val = allMarks[exam]?.[s.id]?.[sub]
        state[exam][s.id][sub] = val != null ? String(val) : ''
      }
    }
  }
  return state
}

export default function MarksEditor({
  students,
  allMarks,
  gradeWeights,
  quizAvgByStudentId,
  assignmentAvgByStudentId,
}: {
  students: Student[]
  allMarks: AllMarksData
  gradeWeights: GradeWeights | null
  quizAvgByStudentId: Record<string, number>
  assignmentAvgByStudentId: Record<string, number>
}) {
  const [selectedExam, setSelectedExam] = useState<Exam>('Mid Term')
  const [marksState, setMarksState] = useState<MarksState>(() => buildInitialState(students, allMarks))
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'marks' | 'grades'>('marks')
  const supabase = useMemo(() => createClient(), [])

  function updateMark(studentId: string, subject: string, value: string) {
    setMarksState(prev => ({
      ...prev,
      [selectedExam]: {
        ...prev[selectedExam],
        [studentId]: { ...prev[selectedExam][studentId], [subject]: value },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const rows = students.flatMap(s =>
      SUBJECTS.map(sub => ({
        student_id: s.id,
        subject:    sub,
        exam:       selectedExam,
        percent:    Number(marksState[selectedExam]?.[s.id]?.[sub]) || 0,
      }))
    )
    const { error: err } = await supabase
      .from('marks')
      .upsert(rows, { onConflict: 'student_id,subject,exam' })
    setSaving(false)
    if (err) { toast.error('Failed to save marks. Please try again.'); return }
    toast.success('Marks saved!')
  }

  function computeGrade(studentId: string): GradeResult | null {
    if (!gradeWeights) return null
    const examAvg  = avgOf(Object.values(marksState['Mid Term']?.[studentId]  ?? {}))
    const finalAvg = avgOf(Object.values(marksState['Final Term']?.[studentId] ?? {}))
    const quizAvg  = quizAvgByStudentId[studentId]       ?? null
    const assignmentAvg = assignmentAvgByStudentId[studentId] ?? null
    return calculateGrade({ assignmentAvg, examAvg, finalAvg, quizAvg }, gradeWeights)
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1">
          {(['marks', 'grades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab === 'grades' ? 'Grade Summary' : 'Enter Marks'}
            </button>
          ))}
        </div>

        {activeTab === 'marks' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {EXAMS.map(exam => (
                <button
                  key={exam}
                  onClick={() => setSelectedExam(exam)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedExam === exam
                      ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {exam}
                </button>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save marks'}
            </button>
          </div>
        )}
      </div>

      {/* Marks table */}
      {activeTab === 'marks' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Student</th>
                  {SUBJECTS.map(sub => (
                    <th key={sub} className="text-left px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize">{sub}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? students.map((s, i) => (
                  <tr key={s.id} className={i < students.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{s.name}</div>
                          <div className="text-[10px] text-gray-400">{s.roll_no}</div>
                        </div>
                      </div>
                    </td>
                    {SUBJECTS.map(sub => (
                      <td key={sub} className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={marksState[selectedExam]?.[s.id]?.[sub] ?? ''}
                          onChange={e => updateMark(s.id, sub, e.target.value)}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={SUBJECTS.length + 1} className="px-5 py-10 text-center text-sm text-gray-400">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade summary */}
      {activeTab === 'grades' && (
        <>
          {!gradeWeights ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#f8f7f4] flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="7" />
                  <line x1="9" y1="6" x2="9" y2="9" />
                  <circle cx="9" cy="12" r="0.5" fill="#9ca3af" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 font-medium">No grade weights configured</p>
              <p className="text-xs text-gray-300 mt-1">An admin must set grade weights in Grade Settings first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map(s => {
                const result = computeGrade(s.id)
                const examAvg  = avgOf(Object.values(marksState['Mid Term']?.[s.id]  ?? {}))
                const finalAvg = avgOf(Object.values(marksState['Final Term']?.[s.id] ?? {}))
                const quizAvg  = quizAvgByStudentId[s.id]        ?? null
                const asgAvg   = assignmentAvgByStudentId[s.id]  ?? null

                const rows: { label: string; value: number | null; weight: number }[] = [
                  { label: 'Exams',       value: examAvg,  weight: gradeWeights.exam_weight       },
                  { label: 'Finals',      value: finalAvg, weight: gradeWeights.final_weight      },
                  { label: 'Assignments', value: asgAvg,   weight: gradeWeights.assignment_weight },
                  { label: 'Quizzes',     value: quizAvg,  weight: gradeWeights.quiz_weight       },
                ]

                const letterCls = result ? (LETTER_COLOR[result.letter] ?? LETTER_COLOR['F']) : 'text-gray-400 bg-gray-50 border-gray-100'

                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    {/* Student header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1a2e1a]/[0.07] flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-[#1a2e1a]">{getInitials(s.name)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 leading-none">{s.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{s.roll_no}</div>
                        </div>
                      </div>
                      {result ? (
                        <div className="text-right">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border text-base font-bold ${letterCls}`}>
                            {result.letter}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 text-center">{result.overall}%</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">No data</span>
                      )}
                    </div>

                    {/* Category breakdown */}
                    <div className="space-y-1.5">
                      {rows.map(({ label, value, weight }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            {value !== null && (
                              <div
                                className="h-full bg-[#6fcf6f] rounded-full"
                                style={{ width: `${Math.min(100, value)}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right tabular-nums">
                            {value !== null ? `${Math.round(value)}%` : '—'}
                          </span>
                          <span className="text-[10px] text-gray-300 w-8 text-right tabular-nums">×{weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
