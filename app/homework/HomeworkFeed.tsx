'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Assignment = {
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

type DueInfo = { badge: string; badgeCls: string; cardBorderCls: string }

function getDueInfo(dateStr: string): DueInfo {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return { badge: 'Overdue',            badgeCls: 'bg-red-50 text-red-600 border-red-100',     cardBorderCls: 'border-red-200' }
  if (diffDays === 0) return { badge: 'Due Today',          badgeCls: 'bg-amber-50 text-amber-600 border-amber-100', cardBorderCls: 'border-amber-200' }
  if (diffDays === 1) return { badge: 'Due Tomorrow',       badgeCls: 'bg-amber-50 text-amber-500 border-amber-100', cardBorderCls: 'border-gray-100' }
  return              { badge: `Due in ${diffDays} days`,   badgeCls: 'bg-green-50 text-green-700 border-green-100',  cardBorderCls: 'border-gray-100' }
}

function getDiffDays(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const DESC_LIMIT = 120

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
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)

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

  function toggleDesc(id: string) {
    setExpandedDesc(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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

  const overdue  = pending.filter(a => getDiffDays(a.due_date) < 0)
  const dueSoon  = pending.filter(a => { const d = getDiffDays(a.due_date); return d >= 0 && d <= 2 })
  const upcoming = pending.filter(a => getDiffDays(a.due_date) > 2)

  function PendingCard({ assignment, leftBorderCls }: { assignment: Assignment; leftBorderCls: string }) {
    const due = getDueInfo(assignment.due_date)
    const isDescLong = assignment.description && assignment.description.length > DESC_LIMIT
    const isExpanded = expandedDesc.has(assignment.id)

    return (
      <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${leftBorderCls} p-4 flex flex-col gap-3`}>
        {/* Top: badges + checkbox */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getSubjectColor(assignment.subject)}`}>
                {assignment.subject.charAt(0).toUpperCase() + assignment.subject.slice(1)}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-[#6fcf6f]/10 text-[#1a2e1a] border-[#6fcf6f]/25">
                Class {assignment.class_num}
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${due.badgeCls}`}>
                {due.badge}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{assignment.title}</h3>
          </div>

          {/* Checkbox circle */}
          <button
            onClick={() => toggle(assignment.id)}
            disabled={toggling === assignment.id}
            title="Mark as done"
            className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-gray-200 hover:border-[#6fcf6f] transition-colors disabled:opacity-40"
          />
        </div>

        {/* Description */}
        {assignment.description && (
          <div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {isExpanded || !isDescLong
                ? assignment.description
                : assignment.description.slice(0, DESC_LIMIT) + '…'}
            </p>
            {isDescLong && (
              <button
                onClick={() => toggleDesc(assignment.id)}
                className="text-[11px] font-medium text-[#6fcf6f] hover:text-[#1a2e1a] mt-1 transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Mark as complete button */}
        <button
          onClick={() => toggle(assignment.id)}
          disabled={toggling === assignment.id}
          className="w-full text-xs font-medium text-gray-400 hover:text-[#1a2e1a] border border-gray-100 hover:border-[#6fcf6f]/40 hover:bg-[#6fcf6f]/5 rounded-lg py-2 transition-colors disabled:opacity-40"
        >
          {toggling === assignment.id ? 'Saving…' : 'Mark as complete'}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${overdue.length > 0 ? 'border-l-red-400' : 'border-l-amber-300'} px-4 py-3`}>
          <div className="text-2xl font-bold text-gray-900">{pending.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Pending</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-[#6fcf6f] px-4 py-3">
          <div className="text-2xl font-bold text-[#6fcf6f]">{localDone.size}</div>
          <div className="text-xs text-gray-400 mt-0.5">Completed</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-gray-200 px-4 py-3">
          <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total</div>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] text-red-400 uppercase tracking-widest font-medium px-1">
            Overdue · {overdue.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdue.map(a => <PendingCard key={a.id} assignment={a} leftBorderCls="border-l-red-400" />)}
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] text-orange-400 uppercase tracking-widest font-medium px-1">
            Due soon · {dueSoon.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dueSoon.map(a => <PendingCard key={a.id} assignment={a} leftBorderCls="border-l-orange-400" />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] text-[#6fcf6f] uppercase tracking-widest font-medium px-1">
            Upcoming · {upcoming.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map(a => <PendingCard key={a.id} assignment={a} leftBorderCls="border-l-[#6fcf6f]" />)}
          </div>
        </div>
      )}

      {/* Completed — collapsed by default */}
      {done.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-widest font-medium px-1 hover:text-gray-600 transition-colors"
          >
            <span>Completed · {done.length}</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
            >
              <polyline points="1,3 5,7 9,3" />
            </svg>
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {done.map(assignment => (
                <div key={assignment.id} className="bg-gray-50 rounded-xl border border-gray-100 border-l-4 border-l-gray-200 p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getSubjectColor(assignment.subject)}`}>
                          {assignment.subject.charAt(0).toUpperCase() + assignment.subject.slice(1)}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-gray-100 text-gray-400 border-gray-200">
                          Done ✓
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-400 line-through leading-snug">{assignment.title}</h3>
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
      )}
    </div>
  )
}
