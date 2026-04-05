'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type WeightRow = {
  id: string
  academic_year: string
  class_num: number
  subject: string
  teacher_id: string
  assignment_weight: number
  exam_weight: number
  final_weight: number
  quiz_weight: number
  created_by?: string | null
  created_at?: string
}

const SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat']
const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1)

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'
const labelCls =
  'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

export default function GradeSettingsClient({
  existingWeights,
  userId,
  role,
  schoolId,
}: {
  existingWeights: WeightRow[]
  userId: string
  role: string
  schoolId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [weights, setWeights] = useState(existingWeights)

  const [year, setYear] = useState('2025-2026')
  const [classNum, setClassNum] = useState('1')
  const [subject, setSubject] = useState('urdu')
  const [assignment, setAssignment] = useState('25')
  const [exam, setExam] = useState('25')
  const [finals, setFinals] = useState('25')
  const [quiz, setQuiz] = useState('25')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function resetForm() {
    setYear('2025-2026')
    setClassNum('1')
    setSubject('urdu')
    setAssignment('25')
    setExam('25')
    setFinals('25')
    setQuiz('25')
  }

  function loadRow(row: WeightRow) {
    setYear(row.academic_year)
    setClassNum(String(row.class_num))
    setSubject(row.subject)
    setAssignment(String(row.assignment_weight))
    setExam(String(row.exam_weight))
    setFinals(String(row.final_weight))
    setQuiz(String(row.quiz_weight))
  }

  const total =
    (Number(assignment) || 0) +
    (Number(exam) || 0) +
    (Number(finals) || 0) +
    (Number(quiz) || 0)

  const totalOk = total === 100
  const remaining = 100 - total

  const existingRow = weights.find(
    (w) =>
      w.academic_year === year.trim() &&
      String(w.class_num) === String(classNum) &&
      w.subject === subject &&
      w.teacher_id === userId
  )

  async function handleSave() {
    if (!year.trim()) {
      toast.error('Academic year is required.')
      return
    }

    if (!classNum.trim()) {
      toast.error('Class is required.')
      return
    }

    if (!subject.trim()) {
      toast.error('Subject is required.')
      return
    }

    if (!schoolId) {
      toast.error('School context missing.')
      return
    }

    if (!totalOk) {
      toast.error('Weights must sum to 100%.')
      return
    }

    setSaving(true)

    const payload = {
      academic_year: year.trim(),
      class_num: Number(classNum),
      subject: subject.trim().toLowerCase(),
      teacher_id: userId,
      school_id: schoolId,
      assignment_weight: Number(assignment),
      exam_weight: Number(exam),
      final_weight: Number(finals),
      quiz_weight: Number(quiz),
      created_by: userId,
    }

    let error: { message: string } | null = null
    let data: WeightRow | null = null

    if (existingRow) {
      const res = await supabase
        .from('grade_weights')
        .update(payload)
        .eq('id', existingRow.id)
        .select()
        .single()

      error = res.error
      data = res.data as WeightRow | null
    } else {
      const res = await supabase
        .from('grade_weights')
        .insert(payload)
        .select()
        .single()

      error = res.error
      data = res.data as WeightRow | null
    }

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (data) {
      setWeights((prev) => [data, ...prev.filter((w) => w.id !== data!.id)])
    }

    toast.success(existingRow ? 'Weights updated!' : 'Weights saved!')
  }

  async function handleDelete() {
    if (!existingRow) {
      toast.error('Select an existing row first.')
      return
    }

    const confirmed = window.confirm(
      `Delete grade weights for ${existingRow.academic_year}, Class ${existingRow.class_num}, ${existingRow.subject}?`
    )

    if (!confirmed) return

    setDeleting(true)

    const { error } = await supabase
      .from('grade_weights')
      .delete()
      .eq('id', existingRow.id)

    setDeleting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setWeights((prev) => prev.filter((w) => w.id !== existingRow.id))
    resetForm()
    toast.success('Weights deleted!')
  }

  return (
    <div className="max-w-3xl space-y-5">
      {weights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Saved Configurations
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {weights.map((w) => (
              <button
                key={w.id}
                onClick={() => loadRow(w)}
                className={`w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors ${
                  year === w.academic_year &&
                  String(w.class_num) === String(classNum) &&
                  subject === w.subject
                    ? 'bg-[#6fcf6f]/5'
                    : ''
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {w.academic_year} · Class {w.class_num} ·{' '}
                    <span className="capitalize">{w.subject}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {role === 'admin' ? `Teacher: ${w.teacher_id}` : 'My subject'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap justify-end">
                  {[
                    ['Asgn', w.assignment_weight],
                    ['Exam', w.exam_weight],
                    ['Final', w.final_weight],
                    ['Quiz', w.quiz_weight],
                  ].map(([lbl, val]) => (
                    <span
                      key={lbl as string}
                      className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5"
                    >
                      {lbl} {val}%
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">
            {existingRow ? 'Edit' : 'New'} Grade Weights
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Weights are saved per academic year, class, and subject.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Academic Year</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2025-2026"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Class</label>
              <select
                value={classNum}
                onChange={(e) => setClassNum(e.target.value)}
                className={inputCls}
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Assignments %', value: assignment, set: setAssignment },
              { label: 'Exams %', value: exam, set: setExam },
              { label: 'Finals %', value: finals, set: setFinals },
              { label: 'Quizzes %', value: quiz, set: setQuiz },
            ] as const).map(({ label, value, set }) => (
              <div key={label}>
                <label className={labelCls}>{label}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div
            className={`flex items-center justify-between text-sm rounded-lg px-4 py-2.5 border ${
              totalOk
                ? 'bg-[#6fcf6f]/10 border-[#6fcf6f]/20 text-[#1a2e1a]'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            <span className="font-medium">Total</span>
            <span className="font-bold tabular-nums">
              {total}%
              {totalOk
                ? ' ✓'
                : remaining > 0
                ? ` — ${remaining}% remaining`
                : ` — ${Math.abs(remaining)}% over`}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !totalOk}
              className="flex-1 bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : existingRow ? 'Update weights' : 'Save weights'}
            </button>

            {existingRow && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}