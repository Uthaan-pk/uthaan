'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { letterGrade } from '@/lib/calculateGrade'
import { computeSubjectFinalGrades, fmtSubject, type WeightRow } from '@/lib/gradeUtils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Student = {
  id: string
  name: string
  roll_no: string
  user_id?: string | null
}

// allMarks[exam][studentId][subject] = percent
type AllMarksData = Record<string, Record<string, Record<string, number | null>>>

// marksState[exam][studentId][subject] = string input
type MarksState = Record<string, Record<string, Record<string, string>>>

type Assignment = {
  id: string
  title: string
  subject: string
  class_num: number | null
  due_date: string | null
  created_at?: string | null
}

type Submission = {
  id: string
  assignment_id: string
  student_id: string
  grade: string | null
  submitted_at: string | null
  reviewed: boolean | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat'] as const
const EXAMS    = ['Mid Term', 'Final Term', 'Unit Test'] as const
type Exam      = typeof EXAMS[number]

const LETTER_STYLE: Record<string, string> = {
  'A+': 'text-[#1a2e1a] bg-[#6fcf6f]/20',
  'A':  'text-green-800 bg-green-50',
  'B':  'text-blue-800  bg-blue-50',
  'C':  'text-amber-800 bg-amber-50',
  'D':  'text-orange-800 bg-orange-50',
  'F':  'text-red-800   bg-red-50',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function avgOf(vals: (string | undefined)[]): number | null {
  const nums = vals.map(v => Number(v)).filter(n => !isNaN(n) && n > 0)
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

// Convert current marksState back to flat rows for grade computation
function marksStateToFlat(
  marksState: MarksState,
  students: Student[]
): { student_id: string; subject: string; exam: string; percent: number | null }[] {
  const rows: { student_id: string; subject: string; exam: string; percent: number | null }[] = []
  for (const exam of EXAMS) {
    for (const s of students) {
      for (const sub of SUBJECTS) {
        const raw = marksState[exam]?.[s.id]?.[sub]
        const pct = raw !== '' && raw != null ? parseFloat(raw) : null
        if (pct != null && !isNaN(pct)) {
          rows.push({ student_id: s.id, subject: sub, exam, percent: pct })
        }
      }
    }
  }
  return rows
}

function fmtDue(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarksEditor({
  students,
  allMarks,
  weightRows,
  assignments,
  submissions,
  quizAvgByStudentId,
  assignmentAvgByStudentId,
}: {
  students: Student[]
  allMarks: AllMarksData
  weightRows: WeightRow[]
  assignments: Assignment[]
  submissions: Submission[]
  quizAvgByStudentId: Record<string, number>
  assignmentAvgByStudentId: Record<string, number>
}) {
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab]     = useState<'marks' | 'assignments' | 'grades'>('marks')
  const [selectedExam, setSelectedExam] = useState<Exam>('Mid Term')
  const [marksState, setMarksState]   = useState<MarksState>(() => buildInitialState(students, allMarks))
  const [saving, setSaving]           = useState(false)

  // ── Marks tab helpers ───────────────────────────────────────────────────────

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
    const { error } = await supabase
      .from('marks')
      .upsert(rows, { onConflict: 'student_id,subject,exam' })
    setSaving(false)
    if (error) { toast.error('Failed to save marks.'); return }
    toast.success('Marks saved!')
  }

  // ── Final Grade tab helpers ─────────────────────────────────────────────────

  // Live final grades computed from current marksState (reflects unsaved edits too)
  const liveMarks   = useMemo(() => marksStateToFlat(marksState, students), [marksState, students])
  const quizAvg     = (sid: string) => quizAvgByStudentId[sid] ?? null
  const asgAvg      = (sid: string) => assignmentAvgByStudentId[sid] ?? null

  // ── Assignment tab helpers ──────────────────────────────────────────────────

  const studentIds = useMemo(() => new Set(students.map(s => s.id)), [students])

  const enrichedAssignments = useMemo(() =>
    assignments.map(a => {
      const asgSubs     = submissions.filter(s => s.assignment_id === a.id && studentIds.has(s.student_id))
      const submitted   = asgSubs.length
      const graded      = asgSubs.filter(s => s.grade != null && s.grade !== '').length
      const gradeNums   = asgSubs
        .map(s => parseFloat(s.grade ?? ''))
        .filter(n => !isNaN(n))
      const avgGrade    = gradeNums.length > 0
        ? Math.round(gradeNums.reduce((a, b) => a + b, 0) / gradeNums.length)
        : null
      return { ...a, submitted, graded, avgGrade, total: students.length }
    }),
    [assignments, submissions, studentIds, students.length]
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1">
          {([
            ['marks',       'Exam Marks'],
            ['assignments', 'Assignments'],
            ['grades',      'Final Grade'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === key
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Exam selector + save — only on Marks tab */}
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
              {saving ? 'Saving…' : 'Save marks'}
            </button>
          </div>
        )}
      </div>

      {/* ── Marks tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'marks' && (
        <>
          {students.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
              No students in this class.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                        Student
                      </th>
                      {SUBJECTS.map(sub => (
                        <th key={sub} className="text-left px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize">
                          {sub}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
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
                              placeholder="—"
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-[#1a2e1a] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-2 text-[11px] text-gray-400">
            Enter marks (0–100) per subject then click Save marks.
          </div>
        </>
      )}

      {/* ── Assignments tab ───────────────────────────────────────────────── */}
      {activeTab === 'assignments' && (
        <>
          {enrichedAssignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
              <div className="text-sm text-gray-400">No assignments for this class yet.</div>
              <div className="text-xs text-gray-300 mt-1">
                Create assignments in the Assignments section.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {enrichedAssignments.map(a => {
                const submittedPct = a.total > 0 ? Math.round((a.submitted / a.total) * 100) : 0
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-gray-100 px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-medium capitalize bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {a.subject}
                          </span>
                          <span className="text-[11px] text-gray-400">Due {fmtDue(a.due_date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs flex-shrink-0">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{a.submitted}/{a.total}</div>
                          <div className="text-[10px] text-gray-400">Submitted</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{a.graded}</div>
                          <div className="text-[10px] text-gray-400">Graded</div>
                        </div>
                        {a.avgGrade !== null && (
                          <div className="text-center">
                            <div className={`font-semibold px-2 py-0.5 rounded text-xs ${
                              a.avgGrade >= 80 ? 'text-green-800 bg-green-50' :
                              a.avgGrade >= 60 ? 'text-amber-800 bg-amber-50' :
                              'text-red-800 bg-red-50'
                            }`}>
                              {a.avgGrade}%
                            </div>
                            <div className="text-[10px] text-gray-400">Class avg</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submission progress bar */}
                    {a.total > 0 && (
                      <div className="mt-3">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6fcf6f] rounded-full transition-all"
                            style={{ width: `${submittedPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">{submittedPct}% of class submitted</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Final Grade tab ───────────────────────────────────────────────── */}
      {activeTab === 'grades' && (
        <>
          {weightRows.length === 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg px-4 py-2.5">
              No grade weights configured for this class. Showing simple averages across exams.
              Configure weights in <span className="font-semibold">Grade Settings</span>.
            </div>
          )}

          {students.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
              No students in this class.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide sticky left-0 bg-gray-50/80 z-10 min-w-[160px]">
                        Student
                      </th>
                      {SUBJECTS.map(sub => (
                        <th key={sub} className="text-center px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize min-w-[90px]">
                          {sub}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide min-w-[80px]">
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const subjectGrades = computeSubjectFinalGrades(
                        s.id,
                        liveMarks,
                        weightRows,
                        quizAvg(s.id),
                        asgAvg(s.id),
                      )
                      const gradeBySubject = Object.fromEntries(
                        subjectGrades.map(g => [g.subject, g])
                      )

                      // Overall: average of all subject finals
                      const overallVals = subjectGrades.map(g => g.overall)
                      const overall = overallVals.length > 0
                        ? Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length * 10) / 10
                        : null

                      return (
                        <tr key={s.id} className={i < students.length - 1 ? 'border-b border-gray-50' : ''}>
                          <td className="px-5 py-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#1a2e1a]/[0.07] flex items-center justify-center text-[#1a2e1a] text-[10px] font-bold flex-shrink-0">
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{s.name}</div>
                                <div className="text-[10px] text-gray-400">{s.roll_no}</div>
                              </div>
                            </div>
                          </td>

                          {SUBJECTS.map(sub => {
                            const g = gradeBySubject[sub]
                            const style = g ? (LETTER_STYLE[g.letter] ?? LETTER_STYLE['F']) : ''
                            return (
                              <td key={sub} className="px-3 py-2.5 text-center">
                                {g ? (
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${style}`}>
                                      {g.letter}
                                    </span>
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                      {g.overall}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            )
                          })}

                          <td className="px-4 py-2.5 text-center">
                            {overall !== null ? (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold ${LETTER_STYLE[letterGrade(overall)] ?? LETTER_STYLE['F']}`}>
                                  {letterGrade(overall)}
                                </span>
                                <span className="text-[10px] text-gray-400 tabular-nums font-medium">
                                  {overall}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-2 text-[11px] text-gray-400">
            Final grades are computed live from marks entered above.
            {weightRows.length > 0 && ' Grade weights from Grade Settings are applied per subject.'}
          </div>
        </>
      )}
    </div>
  )
}
