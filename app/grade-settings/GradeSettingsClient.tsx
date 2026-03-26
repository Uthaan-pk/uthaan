'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type WeightRow = {
  id: string
  academic_year: string
  assignment_weight: number
  exam_weight: number
  final_weight: number
  quiz_weight: number
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'
const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

export default function GradeSettingsClient({
  existingWeights,
  userId,
}: {
  existingWeights: WeightRow[]
  userId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [weights, setWeights] = useState(existingWeights)

  const [year, setYear]           = useState('2025-2026')
  const [assignment, setAssignment] = useState('25')
  const [exam, setExam]           = useState('25')
  const [finals, setFinals]       = useState('25')
  const [quiz, setQuiz]           = useState('25')
  const [saving, setSaving]       = useState(false)

  function loadRow(row: WeightRow) {
    setYear(row.academic_year)
    setAssignment(String(row.assignment_weight))
    setExam(String(row.exam_weight))
    setFinals(String(row.final_weight))
    setQuiz(String(row.quiz_weight))
  }

  const total     = (Number(assignment) || 0) + (Number(exam) || 0) + (Number(finals) || 0) + (Number(quiz) || 0)
  const totalOk   = total === 100
  const remaining = 100 - total

  const existingRow = weights.find(w => w.academic_year === year.trim())

  async function handleSave() {
    if (!year.trim())  { toast.error('Academic year is required.'); return }
    if (!totalOk)      { toast.error('Weights must sum to 100%.'); return }

    setSaving(true)
    const payload = {
      academic_year:     year.trim(),
      assignment_weight: Number(assignment),
      exam_weight:       Number(exam),
      final_weight:      Number(finals),
      quiz_weight:       Number(quiz),
      created_by:        userId,
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
      data  = res.data
    } else {
      const res = await supabase
        .from('grade_weights')
        .insert(payload)
        .select()
        .single()
      error = res.error
      data  = res.data
    }

    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (data)  { setWeights(prev => [data!, ...prev.filter(w => w.id !== data!.id)]) }
    toast.success(existingRow ? 'Weights updated!' : 'Weights saved!')
  }

  return (
    <div className="max-w-lg space-y-5">

      {/* Saved configurations */}
      {weights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Saved Configurations</p>
          </div>
          <div className="divide-y divide-gray-50">
            {weights.map(w => (
              <button
                key={w.id}
                onClick={() => loadRow(w)}
                className={`w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors ${
                  year === w.academic_year ? 'bg-[#6fcf6f]/5' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">{w.academic_year}</span>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  {[
                    ['Asgn', w.assignment_weight],
                    ['Exam', w.exam_weight],
                    ['Final', w.final_weight],
                    ['Quiz', w.quiz_weight],
                  ].map(([lbl, val]) => (
                    <span key={lbl as string} className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                      {lbl} {val}%
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">
            {existingRow ? 'Edit' : 'New'} Grade Weights
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            All four weights must sum to exactly 100%.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Academic Year</label>
            <input
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="e.g. 2025-2026"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Assignments %', value: assignment, set: setAssignment },
              { label: 'Exams %',       value: exam,       set: setExam       },
              { label: 'Finals %',      value: finals,     set: setFinals     },
              { label: 'Quizzes %',     value: quiz,       set: setQuiz       },
            ] as const).map(({ label, value, set }) => (
              <div key={label}>
                <label className={labelCls}>{label}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={value}
                  onChange={e => set(e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className={`flex items-center justify-between text-sm rounded-lg px-4 py-2.5 border ${
            totalOk
              ? 'bg-[#6fcf6f]/10 border-[#6fcf6f]/20 text-[#1a2e1a]'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}>
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

          <button
            onClick={handleSave}
            disabled={saving || !totalOk}
            className="w-full bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : existingRow ? 'Update weights' : 'Save weights'}
          </button>
        </div>
      </div>
    </div>
  )
}
