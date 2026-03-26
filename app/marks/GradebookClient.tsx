'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const CURRENT_TERM = 'Spring Term 2026'
const SUBJECTS = ['Urdu', 'English', 'Math', 'Science', 'Islamiat']

type Student = { id: string; name: string; roll_no: string }
type Assignment = { id: string; title: string; subject: string; class_num?: number | null }
type GradebookMark = {
  id: string
  student_id: string
  subject: string
  score: number | null
  term: string
  assignment_id: string | null
  source: 'manual' | 'submission'
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-300 hover:bg-gray-50'
  if (score >= 80) return 'bg-green-50 text-green-800 hover:bg-green-100'
  if (score >= 60) return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
  return 'bg-red-50 text-red-700 hover:bg-red-100'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

export default function GradebookClient({
  students,
  assignments,
  initialMarks,
}: {
  students: Student[]
  assignments: Assignment[]
  initialMarks: GradebookMark[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [marks, setMarks] = useState(initialMarks)
  const [editing, setEditing] = useState<{ studentId: string; assignmentId: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  // Manual add state
  const [addModal, setAddModal] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [addSubject, setAddSubject] = useState('')
  const [addScore, setAddScore] = useState('')
  const [adding, setAdding] = useState(false)

  // Class filter
  const classes = useMemo(() => {
    const set = new Set<number>()
    assignments.forEach(a => { if (a.class_num != null) set.add(a.class_num) })
    return Array.from(set).sort((a, b) => a - b)
  }, [assignments])

  const [selectedClass, setSelectedClass] = useState<number | ''>(() => classes[0] ?? '')

  const filteredAssignments = useMemo(
    () => selectedClass === '' ? assignments : assignments.filter(a => String(a.class_num) === String(selectedClass)),
    [assignments, selectedClass]
  )

  // marks lookup: student_id → assignment_id → mark
  const marksMap = useMemo(() => {
    const m: Record<string, Record<string, GradebookMark>> = {}
    marks.forEach(mark => {
      if (!mark.assignment_id) return
      if (!m[mark.student_id]) m[mark.student_id] = {}
      m[mark.student_id][mark.assignment_id] = mark
    })
    return m
  }, [marks])

  function startEdit(studentId: string, assignmentId: string) {
    const existing = marksMap[studentId]?.[assignmentId]
    setEditing({ studentId, assignmentId })
    setEditValue(existing?.score != null ? String(existing.score) : '')
  }

  async function commitEdit(studentId: string, assignmentId: string) {
    setEditing(null)
    const score = editValue === '' ? null : parseFloat(editValue)
    if (editValue !== '' && (score === null || isNaN(score))) {
      toast.error('Score must be a number')
      return
    }
    const assignment = assignments.find(a => a.id === assignmentId)
    if (!assignment) return

    const { data, error } = await supabase
      .from('marks')
      .upsert(
        {
          student_id: studentId,
          subject: assignment.subject,
          score,
          term: CURRENT_TERM,
          assignment_id: assignmentId,
          source: 'manual',
        },
        { onConflict: 'student_id,assignment_id' }
      )
      .select('id, student_id, subject, score, term, assignment_id, source')
      .single()

    if (error) { toast.error('Failed to save'); return }

    setMarks(prev => {
      const exists = prev.some(m => m.student_id === studentId && m.assignment_id === assignmentId)
      if (exists) {
        return prev.map(m =>
          m.student_id === studentId && m.assignment_id === assignmentId
            ? { ...m, score, source: 'manual' as const }
            : m
        )
      }
      return [...prev, data as GradebookMark]
    })
  }

  async function handleAddManual() {
    if (!addStudentId || !addSubject || !addScore) { toast.error('Fill in all fields'); return }
    const score = parseFloat(addScore)
    if (isNaN(score)) { toast.error('Score must be a number'); return }

    setAdding(true)
    const { data, error } = await supabase
      .from('marks')
      .insert({ student_id: addStudentId, subject: addSubject, score, term: CURRENT_TERM, assignment_id: null, source: 'manual' })
      .select('id, student_id, subject, score, term, assignment_id, source')
      .single()
    setAdding(false)

    if (error) { toast.error(error.message); return }

    setMarks(prev => [...prev, data as GradebookMark])
    setAddModal(false)
    setAddStudentId('')
    setAddSubject('')
    setAddScore('')
    toast.success('Mark added')
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedClass('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedClass === ''
                ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {classes.map(c => (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedClass === c
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              Class {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Mark
        </button>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
          <div className="text-sm text-gray-400">No assignments found for this class</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10 min-w-[160px]">
                    Student
                  </th>
                  {filteredAssignments.map(a => (
                    <th key={a.id} className="px-3 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap text-center min-w-[90px]">
                      <div className="truncate max-w-[120px]">{a.title}</div>
                      <div className="text-[10px] text-gray-300 normal-case font-normal capitalize">{a.subject}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={filteredAssignments.length + 1} className="px-5 py-10 text-center text-sm text-gray-400">
                      No students found
                    </td>
                  </tr>
                ) : students.map((student, i) => (
                  <tr key={student.id} className={i < students.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-5 py-3 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1a2e1a]/[0.07] flex items-center justify-center text-[#1a2e1a] text-[10px] font-semibold flex-shrink-0">
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{student.name}</div>
                          <div className="text-[10px] text-gray-400">{student.roll_no}</div>
                        </div>
                      </div>
                    </td>
                    {filteredAssignments.map(a => {
                      const mark = marksMap[student.id]?.[a.id]
                      const isEditing = editing?.studentId === student.id && editing?.assignmentId === a.id
                      return (
                        <td key={a.id} className="px-3 py-2 text-center">
                          {isEditing ? (
                            <input
                              autoFocus
                              type="number"
                              min="0"
                              max="100"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => commitEdit(student.id, a.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitEdit(student.id, a.id)
                                if (e.key === 'Escape') setEditing(null)
                              }}
                              className="w-16 border border-[#6fcf6f] rounded-lg px-2 py-1 text-sm text-center text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(student.id, a.id)}
                              title="Click to edit"
                              className={`w-full min-w-[56px] rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${scoreColor(mark?.score ?? null)}`}
                            >
                              {mark?.score != null ? (
                                <span className="flex items-center justify-center gap-1">
                                  {mark.score}
                                  {mark.source === 'submission' && (
                                    <span className="text-[9px] bg-blue-100 text-blue-600 rounded px-0.5 font-bold leading-tight py-0.5">S</span>
                                  )}
                                </span>
                              ) : '—'}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Manual Mark Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Add Manual Mark</h2>
              <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Student</label>
                <select value={addStudentId} onChange={e => setAddStudentId(e.target.value)} className={inputCls}>
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Subject</label>
                <select value={addSubject} onChange={e => setAddSubject(e.target.value)} className={inputCls}>
                  <option value="">Select subject…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Score (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={addScore}
                  onChange={e => setAddScore(e.target.value)}
                  placeholder="e.g. 85"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setAddModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                disabled={adding}
                className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {adding ? 'Saving…' : 'Add Mark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
