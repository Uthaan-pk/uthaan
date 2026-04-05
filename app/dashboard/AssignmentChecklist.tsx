'use client'

import { useState, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type ChecklistAssignment = {
  id: string
  title: string
  subject: string
  due_date: string | null
}

type ChecklistSubmission = {
  assignment_id: string
}

type ManualCheck = {
  assignment_id: string
}

export default function AssignmentChecklist({
  assignments,
  submissions,
  manualChecks: initialManualChecks,
  studentId,
}: {
  assignments: ChecklistAssignment[]
  submissions: ChecklistSubmission[]
  manualChecks: ManualCheck[]
  studentId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [manualChecked, setManualChecked] = useState<Set<string>>(
    () => new Set(initialManualChecks.map(c => c.assignment_id))
  )
  const [, startTransition] = useTransition()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const submittedIds = useMemo(
    () => new Set(submissions.map(s => s.assignment_id)),
    [submissions]
  )

  function isChecked(aId: string) {
    if (mode === 'auto') return submittedIds.has(aId)
    return manualChecked.has(aId)
  }

  function toggleManual(aId: string) {
    if (mode !== 'manual') return
    const next = new Set(manualChecked)
    const nowChecked = !next.has(aId)
    if (nowChecked) {
      next.add(aId)
    } else {
      next.delete(aId)
    }
    setManualChecked(next)

    startTransition(async () => {
      if (nowChecked) {
        await supabase
          .from('assignment_manual_checks')
          .upsert({ student_id: studentId, assignment_id: aId }, { onConflict: 'student_id,assignment_id' })
      } else {
        await supabase
          .from('assignment_manual_checks')
          .delete()
          .eq('student_id', studentId)
          .eq('assignment_id', aId)
      }
    })
  }

  // Sort: overdue first, then by due_date asc
  const sorted = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return da - db
    })
  }, [assignments])

  function dueStatus(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | 'none' {
    if (!dateStr) return 'none'
    const [y, m, d] = dateStr.split('-').map(Number)
    const due = new Date(y, m - 1, d)
    due.setHours(0, 0, 0, 0)
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return 'overdue'
    if (diff === 0) return 'today'
    return 'upcoming'
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
        No upcoming assignments.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header + toggle */}
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Assignments</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['auto', 'manual'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                mode === m
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {sorted.map(a => {
          const checked = isChecked(a.id)
          const status = dueStatus(a.due_date)
          const isOverdue = status === 'overdue' && !checked

          return (
            <div
              key={a.id}
              onClick={() => toggleManual(a.id)}
              className={`px-5 py-3 flex items-start gap-3 ${
                mode === 'manual' ? 'cursor-pointer hover:bg-gray-50/60 transition-colors' : ''
              }`}
            >
              {/* Checkbox indicator */}
              <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                checked
                  ? 'bg-[#6fcf6f] border-[#6fcf6f]'
                  : isOverdue
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}>
                {checked && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {a.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-gray-400 capitalize">{a.subject}</span>
                  {a.due_date && (
                    <span className={`text-[11px] font-medium ${
                      isOverdue ? 'text-red-500' : status === 'today' ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {isOverdue ? '⚠ Overdue · ' : status === 'today' ? 'Due today · ' : 'Due '}
                      {new Date(a.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {mode === 'manual' && (
        <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/40">
          <p className="text-[11px] text-gray-400">
            Manual mode: tap an item to check/uncheck it. This does not affect actual submissions.
          </p>
        </div>
      )}
    </div>
  )
}
