'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { writeAuditLog } from '@/lib/audit'
import { letterGrade } from '@/lib/calculateGrade'
import { CURRENT_TERM } from '@/lib/constants'
import {
  computeSubjectFinalGrades,
  buildExamCategoryMap,
  type WeightRow,
  type ExamType,
} from '@/lib/gradeUtils'

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

const ALL_SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat'] as const

const DEFAULT_EXAM_TYPES: ExamType[] = [
  { id: 'default-mid', name: 'Mid Term', category: 'mid' },
  { id: 'default-final', name: 'Final Term', category: 'final' },
  { id: 'default-unit', name: 'Unit Test', category: 'unit' },
]

const LETTER_STYLE: Record<string, string> = {
  'A+': 'text-[#1a2e1a] bg-[#6fcf6f]/20',
  A: 'text-green-800 bg-green-50',
  B: 'text-blue-800 bg-blue-50',
  C: 'text-amber-800 bg-amber-50',
  D: 'text-orange-800 bg-orange-50',
  F: 'text-red-800 bg-red-50',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function buildInitialState(
  students: Student[],
  allMarks: AllMarksData,
  examNames: string[],
  subjects: readonly string[],
): MarksState {
  const state: MarksState = {}
  for (const exam of examNames) {
    state[exam] = {}
    for (const s of students) {
      state[exam][s.id] = {}
      for (const sub of subjects) {
        const val = allMarks[exam]?.[s.id]?.[sub]
        state[exam][s.id][sub] = val != null ? String(val) : ''
      }
    }
  }
  return state
}

function marksStateToFlat(
  marksState: MarksState,
  students: Student[],
  examNames: string[],
  subjects: readonly string[],
): { student_id: string; subject: string; exam: string; percent: number | null }[] {
  const rows: { student_id: string; subject: string; exam: string; percent: number | null }[] = []
  for (const exam of examNames) {
    for (const s of students) {
      for (const sub of subjects) {
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
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeSubject(value: string) {
  return value.trim().toLowerCase()
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
  examTypes: examTypesProp = [],
  visibleSubjects = [],
  schoolId = null,
  readOnlyGradesOnly = false,
}: {
  students: Student[]
  allMarks: AllMarksData
  weightRows: WeightRow[]
  assignments: Assignment[]
  submissions: Submission[]
  quizAvgByStudentId: Record<string, number>
  assignmentAvgByStudentId: Record<string, number>
  examTypes?: ExamType[]
  visibleSubjects?: string[]
  schoolId?: string | null
  readOnlyGradesOnly?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [supabase])

  const [examTypes, setExamTypes] = useState<ExamType[]>(
    examTypesProp.length > 0 ? examTypesProp : DEFAULT_EXAM_TYPES
  )
  const [showExamForm, setShowExamForm] = useState(false)
  const [editingExam, setEditingExam] = useState<ExamType | null>(null)
  const [examFormName, setExamFormName] = useState('')
  const [examFormCat, setExamFormCat] = useState<'mid' | 'final' | 'unit'>('unit')
  const [savingExamType, setSavingExamType] = useState(false)

  const subjects: readonly string[] = useMemo(
    () =>
      visibleSubjects.length > 0
        ? Array.from(new Set(visibleSubjects.map(normalizeSubject)))
        : ALL_SUBJECTS,
    [visibleSubjects]
  )

  const examNames = useMemo(() => examTypes.map(e => e.name), [examTypes])
  const examCategoryMap = useMemo(() => buildExamCategoryMap(examTypes), [examTypes])

  const [activeTab, setActiveTab] = useState<'marks' | 'assignments' | 'grades'>(
    readOnlyGradesOnly ? 'grades' : 'marks'
  )
  const [selectedExam, setSelectedExam] = useState<string>(
    () => examTypes[0]?.name ?? 'Mid Term'
  )
  const [marksState, setMarksState] = useState<MarksState>(
    () => buildInitialState(students, allMarks, examNames, subjects)
  )
  const [saving, setSaving] = useState(false)

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
    if (!schoolId) {
      toast.error('School context is missing for this account.')
      return
    }

    setSaving(true)

    const studentIds = students.map(s => s.id)

    const filledRows = students.flatMap(s =>
      subjects.flatMap(sub => {
        const raw = marksState[selectedExam]?.[s.id]?.[sub]?.trim() ?? ''

        if (raw === '') return []

        const percent = Number(raw)
        if (Number.isNaN(percent) || percent < 0 || percent > 100) {
          return []
        }

        return [
          {
            student_id: s.id,
            subject: sub,
            exam: selectedExam,
            percent,
            source: 'manual',
            term: CURRENT_TERM,
            school_id: schoolId,
          },
        ]
      })
    )

    const invalidEntryExists = students.some(s =>
      subjects.some(sub => {
        const raw = marksState[selectedExam]?.[s.id]?.[sub]?.trim() ?? ''
        if (raw === '') return false
        const value = Number(raw)
        return Number.isNaN(value) || value < 0 || value > 100
      })
    )

    if (invalidEntryExists) {
      setSaving(false)
      toast.error('Marks must be between 0 and 100.')
      return
    }

    const { error: deleteError } = await supabase
      .from('marks')
      .delete()
      .eq('exam', selectedExam)
      .in('student_id', studentIds)
      .in('subject', [...subjects])

    if (deleteError) {
      setSaving(false)
      toast.error(deleteError.message || 'Failed to clear old marks.')
      return
    }

    if (filledRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('marks')
        .upsert(filledRows, { onConflict: 'student_id,subject,exam' })

      if (upsertError) {
        setSaving(false)
        toast.error(upsertError.message || 'Failed to save marks.')
        return
      }
    }

    await writeAuditLog(supabase, {
      actor_user_id: userIdRef.current,
      action: 'update',
      entity_type: 'marks',
      entity_id: schoolId ?? 'unknown',
      new_value: { exam: selectedExam, count: filledRows.length },
    })

    setSaving(false)
    toast.success('Marks saved!')
  }

  function openAddExam() {
    setEditingExam(null)
    setExamFormName('')
    setExamFormCat('unit')
    setShowExamForm(true)
  }

  function openEditExam(et: ExamType) {
    setEditingExam(et)
    setExamFormName(et.name)
    setExamFormCat(et.category)
    setShowExamForm(true)
  }

  async function saveExamType() {
    const name = examFormName.trim()
    if (!name) return
    setSavingExamType(true)

    if (editingExam && !editingExam.id.startsWith('default-')) {
      const { error } = await supabase
        .from('exam_types')
        .update({ name, category: examFormCat })
        .eq('id', editingExam.id)
      setSavingExamType(false)
      if (error) {
        toast.error('Failed to update exam type.')
        return
      }
      setExamTypes(prev =>
        prev.map(e =>
          e.id === editingExam.id ? { ...e, name, category: examFormCat } : e
        )
      )
      if (selectedExam === editingExam.name) setSelectedExam(name)
    } else if (!editingExam) {
      const { data, error } = await supabase
        .from('exam_types')
        .insert({ name, category: examFormCat })
        .select('id, name, category')
        .single()
      setSavingExamType(false)
      if (error || !data) {
        toast.error('Failed to create exam type.')
        return
      }
      setExamTypes(prev => [...prev, data as ExamType])
    } else {
      setSavingExamType(false)
      setExamTypes(prev =>
        prev.map(e =>
          e.id === editingExam.id ? { ...e, name, category: examFormCat } : e
        )
      )
      if (selectedExam === editingExam.name) setSelectedExam(name)
    }

    toast.success(editingExam ? 'Exam type updated.' : 'Exam type created.')
    setShowExamForm(false)
  }

  const liveMarks = useMemo(
    () => marksStateToFlat(marksState, students, examNames, subjects),
    [marksState, students, examNames, subjects]
  )
  const quizAvg = (sid: string) => quizAvgByStudentId[sid] ?? null
  const asgAvg = (sid: string) => assignmentAvgByStudentId[sid] ?? null

  const studentIds = useMemo(() => new Set(students.map(s => s.id)), [students])

  const enrichedAssignments = useMemo(
    () =>
      assignments
        .filter(a => subjects.includes(normalizeSubject(a.subject ?? '')))
        .map(a => {
          const asgSubs = submissions.filter(
            s => s.assignment_id === a.id && studentIds.has(s.student_id)
          )
          const submitted = asgSubs.length
          const graded = asgSubs.filter(
            s => s.grade != null && s.grade !== ''
          ).length
          const gradeNums = asgSubs
            .map(s => parseFloat(s.grade ?? ''))
            .filter(n => !isNaN(n))
          const avgGrade =
            gradeNums.length > 0
              ? Math.round(
                  gradeNums.reduce((a, b) => a + b, 0) / gradeNums.length
                )
              : null
          return { ...a, submitted, graded, avgGrade, total: students.length }
        }),
    [assignments, submissions, studentIds, students.length, subjects]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {readOnlyGradesOnly ? (
          <div>
            <div className="text-sm font-semibold text-gray-900">Final Grades</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Read-only academic summary for this class.
            </div>
          </div>
        ) : (
          <div className="flex gap-1">
            {([
              ['marks', 'Exam Marks'],
              ['assignments', 'Assignments'],
              ['grades', 'Final Grade'],
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
        )}

        {!readOnlyGradesOnly && activeTab === 'marks' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {examTypes.map(et => (
                <button
                  key={et.id}
                  onClick={() => setSelectedExam(et.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedExam === et.name
                      ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {et.name}
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      openEditExam(et)
                    }}
                    className="ml-1.5 opacity-40 hover:opacity-100 text-[10px] cursor-pointer"
                    title="Edit exam type"
                  >
                    ✎
                  </span>
                </button>
              ))}
              <button
                onClick={openAddExam}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                title="Add exam type"
              >
                + Add
              </button>
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

      {!readOnlyGradesOnly && activeTab === 'marks' && showExamForm && (
        <div className="mb-4 bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={examFormName}
              onChange={e => setExamFormName(e.target.value)}
              placeholder="e.g. Midterm 2"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 w-44 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Grade category
            </label>
            <select
              value={examFormCat}
              onChange={e => setExamFormCat(e.target.value as 'mid' | 'final' | 'unit')}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            >
              <option value="mid">Mid-term weight</option>
              <option value="final">Final weight</option>
              <option value="unit">Unit/assignment weight</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveExamType}
              disabled={savingExamType || !examFormName.trim()}
              className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {savingExamType ? 'Saving…' : editingExam ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => setShowExamForm(false)}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!readOnlyGradesOnly && activeTab === 'marks' && (
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
                      {subjects.map(sub => (
                        <th
                          key={sub}
                          className="text-left px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize"
                        >
                          {sub}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr
                        key={s.id}
                        className={i < students.length - 1 ? 'border-b border-gray-50' : ''}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                              {getInitials(s.name)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {s.roll_no}
                              </div>
                            </div>
                          </div>
                        </td>
                        {subjects.map(sub => (
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

      {!readOnlyGradesOnly && activeTab === 'assignments' && (
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
                const submittedPct =
                  a.total > 0 ? Math.round((a.submitted / a.total) * 100) : 0
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-gray-100 px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {a.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-medium capitalize bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {a.subject}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Due {fmtDue(a.due_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs flex-shrink-0">
                        <Link
                          href={`/assignments?open=${a.id}`}
                          className="text-[11px] font-medium text-[#1a2e1a] bg-[#6fcf6f]/10 border border-[#6fcf6f]/20 hover:bg-[#6fcf6f]/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          View submissions →
                        </Link>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {a.submitted}/{a.total}
                          </div>
                          <div className="text-[10px] text-gray-400">Submitted</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{a.graded}</div>
                          <div className="text-[10px] text-gray-400">Graded</div>
                        </div>
                        {a.avgGrade !== null && (
                          <div className="text-center">
                            <div
                              className={`font-semibold px-2 py-0.5 rounded text-xs ${
                                a.avgGrade >= 80
                                  ? 'text-green-800 bg-green-50'
                                  : a.avgGrade >= 60
                                    ? 'text-amber-800 bg-amber-50'
                                    : 'text-red-800 bg-red-50'
                              }`}
                            >
                              {a.avgGrade}%
                            </div>
                            <div className="text-[10px] text-gray-400">Class avg</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {a.total > 0 && (
                      <div className="mt-3">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6fcf6f] rounded-full transition-all"
                            style={{ width: `${submittedPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {submittedPct}% of class submitted
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'grades' && (
        <>
          {weightRows.length === 0 && (
            <div className="mb-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg px-4 py-2.5">
              No grade weights configured for this class. Showing simple averages
              across exams. Configure weights in{' '}
              <span className="font-semibold">Grade Settings</span>.
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
                      {ALL_SUBJECTS.map(sub => (
                        <th
                          key={sub}
                          className="text-center px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize min-w-[90px]"
                        >
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
                        examCategoryMap,
                      )
                      const gradeBySubject = Object.fromEntries(
                        subjectGrades.map(g => [g.subject, g])
                      )

                      const overallVals = subjectGrades.map(g => g.overall)
                      const overall =
                        overallVals.length > 0
                          ? Math.round(
                              (overallVals.reduce((a, b) => a + b, 0) /
                                overallVals.length) *
                                10
                            ) / 10
                          : null

                      return (
                        <tr
                          key={s.id}
                          className={i < students.length - 1 ? 'border-b border-gray-50' : ''}
                        >
                          <td className="px-5 py-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#1a2e1a]/[0.07] flex items-center justify-center text-[#1a2e1a] text-[10px] font-bold flex-shrink-0">
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {s.name}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {s.roll_no}
                                </div>
                              </div>
                            </div>
                          </td>

                          {ALL_SUBJECTS.map(sub => {
                            const g = gradeBySubject[sub]
                            const style = g
                              ? (LETTER_STYLE[g.letter] ?? LETTER_STYLE['F'])
                              : ''

                            return (
                              <td key={sub} className="px-3 py-2.5 text-center">
                                {g ? (
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <span
                                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${style}`}
                                    >
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
                                <span
                                  className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2 rounded-lg text-xs font-bold ${
                                    LETTER_STYLE[letterGrade(overall)] ??
                                    LETTER_STYLE['F']
                                  }`}
                                >
                                  {letterGrade(overall)}
                                </span>
                                <span className="text-[10px] text-gray-400 tabular-nums">
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
            {readOnlyGradesOnly
              ? 'Read-only final grades computed from recorded marks, assignment averages, and configured weights.'
              : 'Final grades update live from the current marks, assignment averages, and configured weights.'}
          </div>
        </>
      )}
    </div>
  )
}
