'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Assignment = {
  id: string
  title: string
  description: string
  subject: string
  class_num: number
  stage: string
  due_date: string
  created_by: string
  created_at: string
}

type Completion = {
  assignment_id: string
  student_id: string
}

type Student = {
  id: string
  class_num: number
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

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
  if (diffDays < 0)   return { badge: 'Overdue',          badgeCls: 'bg-red-50 text-red-600 border-red-100',      cardBorderCls: 'border-red-200' }
  if (diffDays === 0)  return { badge: 'Due Today',        badgeCls: 'bg-amber-50 text-amber-600 border-amber-100', cardBorderCls: 'border-amber-200' }
  if (diffDays === 1)  return { badge: 'Due Tomorrow',     badgeCls: 'bg-amber-50 text-amber-500 border-amber-100', cardBorderCls: 'border-gray-100' }
  return               { badge: `Due in ${diffDays} days`, badgeCls: 'bg-green-50 text-green-700 border-green-100',  cardBorderCls: 'border-gray-100' }
}

export default function HomeworkBoard({
  assignments: initialAssignments,
  completions,
  students,
  createdBy,
}: {
  assignments: Assignment[]
  completions: Completion[]
  students: Student[]
  createdBy: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [assignments, setAssignments] = useState(initialAssignments)
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [classNum, setClassNum] = useState('')
  const [stage, setStage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  // completion count per assignment_id
  const completionCounts = useMemo(() => {
    const map: Record<string, number> = {}
    completions.forEach(c => {
      map[c.assignment_id] = (map[c.assignment_id] ?? 0) + 1
    })
    return map
  }, [completions])

  // student count per class_num
  const studentCounts = useMemo(() => {
    const map: Record<number, number> = {}
    students.forEach(s => {
      map[s.class_num] = (map[s.class_num] ?? 0) + 1
    })
    return map
  }, [students])

  function resetForm() {
    setTitle(''); setDescription(''); setSubject(''); setClassNum(''); setStage(''); setDueDate('')
  }

  function openModal() { resetForm(); setModalOpen(true) }
  function closeModal() { if (saving) return; setModalOpen(false); resetForm() }

  async function handleSubmit() {
    const classNumParsed = parseInt(classNum, 10)
    if (!title.trim() || !subject.trim() || isNaN(classNumParsed) || !dueDate) {
      toast.error('Title, subject, class number, and due date are required.')
      return
    }
    setSaving(true)

    const { data, error: err } = await supabase
      .from('assignments')
      .insert({
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        class_num: classNumParsed,
        stage: stage.trim(),
        due_date: dueDate,
        created_by: createdBy,
      })
      .select()
      .single()

    setSaving(false)
    if (err) { toast.error(err.message); return }

    setAssignments(prev => [data, ...prev])
    toast.success('Homework posted!')
    setModalOpen(false)
    resetForm()
    router.refresh()
  }

  return (
    <>
      <div className="max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} posted
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Track homework completion across classes</p>
          </div>
          <button
            onClick={openModal}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Post homework
          </button>
        </div>

        {/* List */}
        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center text-center">
            <p className="text-sm text-gray-400 font-medium">No homework posted yet</p>
            <p className="text-xs text-gray-300 mt-1">Click "Post homework" to create the first assignment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(assignment => {
              const totalStudents = studentCounts[assignment.class_num] ?? 0
              const completed = completionCounts[assignment.id] ?? 0
              const pct = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0
              const due = getDueInfo(assignment.due_date)

              return (
                <div key={assignment.id} className={`bg-white rounded-xl border p-4 ${due.cardBorderCls}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getSubjectColor(assignment.subject)}`}>
                          {assignment.subject.charAt(0).toUpperCase() + assignment.subject.slice(1)}
                        </span>
                        <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">
                          Class {assignment.class_num}{assignment.stage ? ` · ${assignment.stage}` : ''}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${due.badgeCls}`}>
                          {due.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{assignment.description}</p>
                      )}
                    </div>

                    {/* Completion stats */}
                    <div className="flex-shrink-0 text-right min-w-[4rem]">
                      <div className="text-lg font-bold text-gray-900">{pct}%</div>
                      <div className="text-[11px] text-gray-400">{completed}/{totalStudents}</div>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-[#6fcf6f] h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/25 z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">Post homework</h3>
                <button onClick={closeModal} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Title</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 3 exercises"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Instructions, page numbers, etc."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Subject</label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Math"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Class number</label>
                    <input
                      type="number"
                      min="1"
                      value={classNum}
                      onChange={e => setClassNum(e.target.value)}
                      placeholder="e.g. 5"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Stage</label>
                    <input
                      value={stage}
                      onChange={e => setStage(e.target.value)}
                      placeholder="e.g. Primary"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Due date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
                <button onClick={closeModal} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Posting...' : 'Post homework'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
