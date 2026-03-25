'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Assignment = {
  id: string
  title: string
  description: string
  subject: string
  class_num: number
  stage: string
  due_date: string
  created_at: string
}

type Completion = {
  assignment_id: string
  completed_at: string
}

const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-50 text-blue-700 border-blue-100',
  english: 'bg-purple-50 text-purple-700 border-purple-100',
  urdu: 'bg-orange-50 text-orange-700 border-orange-100',
  science: 'bg-teal-50 text-teal-700 border-teal-100',
  islamiat: 'bg-amber-50 text-amber-700 border-amber-100',
  social: 'bg-pink-50 text-pink-700 border-pink-100',
  history: 'bg-rose-50 text-rose-700 border-rose-100',
  computer: 'bg-sky-50 text-sky-700 border-sky-100',
}

function getSubjectColor(subject: string) {
  return SUBJECT_COLORS[subject.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-100'
}

function formatDueDate(dateStr: string) {
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Overdue', cls: 'text-red-500' }
  if (diff === 0) return { label: 'Due today', cls: 'text-amber-500' }
  if (diff === 1) return { label: 'Due tomorrow', cls: 'text-amber-400' }
  return {
    label: `Due ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    cls: 'text-gray-400',
  }
}

export default function HomeworkFeed({
  assignments,
  completions,
  studentId,
}: {
  assignments: Assignment[]
  completions: Completion[]
  studentId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [toggling, setToggling] = useState<string | null>(null)
  const [localDone, setLocalDone] = useState<Set<string>>(
    () => new Set(completions.map(c => c.assignment_id))
  )

  async function toggle(assignmentId: string) {
    if (toggling) return
    setToggling(assignmentId)
    const isDone = localDone.has(assignmentId)

    if (isDone) {
      setLocalDone(prev => { const next = new Set(prev); next.delete(assignmentId); return next })
      const { error } = await supabase
        .from('assignment_completions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
      if (error) setLocalDone(prev => new Set([...prev, assignmentId]))
    } else {
      setLocalDone(prev => new Set([...prev, assignmentId]))
      const { error } = await supabase
        .from('assignment_completions')
        .insert({ assignment_id: assignmentId, student_id: studentId })
      if (error) {
        setLocalDone(prev => { const next = new Set(prev); next.delete(assignmentId); return next })
      }
    }

    setToggling(null)
    router.refresh()
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <line x1="7" y1="7" x2="13" y2="7" />
            <line x1="7" y1="10" x2="13" y2="10" />
            <line x1="7" y1="13" x2="10" y2="13" />
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-medium">No homework posted yet</p>
        <p className="text-xs text-gray-300 mt-1">Your assignments will appear here</p>
      </div>
    )
  }

  const pending = assignments.filter(a => !localDone.has(a.id))
  const done = assignments.filter(a => localDone.has(a.id))

  return (
    <div className="max-w-2xl space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-2xl font-bold text-gray-900">{pending.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Pending</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-2xl font-bold text-[#6fcf6f]">{localDone.size}</div>
          <div className="text-xs text-gray-400 mt-0.5">Completed</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total</div>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium px-1">Pending</p>
          {pending.map(assignment => {
            const due = formatDueDate(assignment.due_date)
            return (
              <div key={assignment.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getSubjectColor(assignment.subject)}`}>
                        {assignment.subject.charAt(0).toUpperCase() + assignment.subject.slice(1)}
                      </span>
                      <span className={`text-[11px] ${due.cls}`}>{due.label}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{assignment.title}</h3>
                    {assignment.description && (
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{assignment.description}</p>
                    )}
                  </div>
                  {/* Unchecked circle */}
                  <button
                    onClick={() => toggle(assignment.id)}
                    disabled={toggling === assignment.id}
                    title="Mark as done"
                    className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-gray-200 hover:border-[#6fcf6f] transition-colors disabled:opacity-40"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium px-1">Completed</p>
          {done.map(assignment => (
            <div key={assignment.id} className="bg-white rounded-xl border border-gray-100 p-4 opacity-55">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getSubjectColor(assignment.subject)}`}>
                      {assignment.subject.charAt(0).toUpperCase() + assignment.subject.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-500 line-through">{assignment.title}</h3>
                </div>
                {/* Checked circle */}
                <button
                  onClick={() => toggle(assignment.id)}
                  disabled={toggling === assignment.id}
                  title="Mark as not done"
                  className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#6fcf6f] border-2 border-[#6fcf6f] flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,4.5 3.5,7 8,1.5" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
