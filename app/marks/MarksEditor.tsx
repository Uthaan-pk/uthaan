'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Student = { id: string; name: string; roll_no: string }
// allMarks[exam][student_id][subject] = percent
type AllMarksData = Record<string, Record<string, Record<string, number | null>>>
// marksState[exam][student_id][subject] = string input value
type MarksState = Record<string, Record<string, Record<string, string>>>

const SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat']
const EXAMS = ['Mid Term', 'Final Term', 'Unit Test'] as const
type Exam = typeof EXAMS[number]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
}: {
  students: Student[]
  allMarks: AllMarksData
}) {
  const [selectedExam, setSelectedExam] = useState<Exam>('Mid Term')
  const [marksState, setMarksState] = useState<MarksState>(() => buildInitialState(students, allMarks))
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  function updateMark(studentId: string, subject: string, value: string) {
    setMarksState(prev => ({
      ...prev,
      [selectedExam]: {
        ...prev[selectedExam],
        [studentId]: {
          ...prev[selectedExam][studentId],
          [subject]: value,
        },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const rows = students.flatMap(s =>
      SUBJECTS.map(sub => ({
        student_id: s.id,
        subject: sub,
        exam: selectedExam,
        percent: Number(marksState[selectedExam]?.[s.id]?.[sub]) || 0,
      }))
    )
    const { error: err } = await supabase.from('marks').upsert(rows, { onConflict: 'student_id,subject,exam' })
    setSaving(false)
    if (err) {
      toast.error('Failed to save marks. Please try again.')
      return
    }
    toast.success('Marks saved!')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
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
    </div>
  )
}
