'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Student = { id: string; name: string; roll_no: string }
type MarkRow = { id: string; student_id: string; subject: string; exam: string; percent: number | null; source?: string | null }

const SUBJECTS = ['urdu', 'english', 'math', 'science', 'islamiat']
const EXAMS = ['Mid Term', 'Final Term', 'Unit Test']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function gradeColor(p: number | null) {
  if (p === null) return 'text-gray-300'
  if (p >= 80) return 'text-green-700'
  if (p >= 60) return 'text-blue-700'
  if (p >= 40) return 'text-amber-700'
  return 'text-red-600'
}

export default function GradebookGrid({
  students,
  marks: initialMarks,
  readOnly = true,
  allowedExams,
}: {
  students: Student[]
  marks: MarkRow[]
  readOnly?: boolean
  allowedExams?: string[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [marks, setMarks] = useState<MarkRow[]>(initialMarks)
  const examOptions = useMemo(
    () => (allowedExams && allowedExams.length > 0 ? allowedExams : EXAMS),
    [allowedExams]
  )
  const [selectedExam, setSelectedExam] = useState(() => examOptions[0] ?? 'Mid Term')
  const [editingCell, setEditingCell] = useState<{ studentId: string; subject: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const markMap = useMemo(() => {
    const m: Record<string, Record<string, MarkRow>> = {}
    marks.filter(mk => mk.exam === selectedExam).forEach(mk => {
      if (!m[mk.student_id]) m[mk.student_id] = {}
      m[mk.student_id][mk.subject.toLowerCase()] = mk
    })
    return m
  }, [marks, selectedExam])

  function startEdit(studentId: string, subject: string) {
    if (readOnly) return
    const existing = markMap[studentId]?.[subject]
    setEditingCell({ studentId, subject })
    setEditValue(existing?.percent != null ? String(existing.percent) : '')
  }

  async function saveCell() {
    if (readOnly || !editingCell) return
    const pct = parseFloat(editValue)
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Enter 0–100'); return }
    setSaving(true)
    const { studentId, subject } = editingCell
    const existing = markMap[studentId]?.[subject]
    let result: MarkRow | null = null
    if (existing) {
      const { data, error } = await supabase.from('marks').update({ percent: pct }).eq('id', existing.id).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      result = data
    } else {
      const { data, error } = await supabase.from('marks').insert({
        student_id: studentId, subject: subject.toLowerCase(), exam: selectedExam,
        percent: pct, source: 'manual',
      }).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      result = data
    }
    if (result) {
      setMarks(prev => {
        const next = prev.filter(m => !(m.student_id === studentId && m.subject.toLowerCase() === subject && m.exam === selectedExam))
        return [...next, result!]
      })
    }
    setSaving(false)
    setEditingCell(null)
    toast.success('Saved')
  }

  function avg(studentId: string) {
    const vals = SUBJECTS.map(s => markMap[studentId]?.[s]?.percent).filter(v => v != null) as number[]
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }

  return (
    <div>
      {/* Exam selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {examOptions.map(e => (
          <button key={e} onClick={() => setSelectedExam(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedExam === e ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            {e}
          </button>
        ))}
        {readOnly ? (
          <div className="ml-auto text-[11px] text-gray-400">
            Read-only view
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
            <span><span className="inline-block w-2 h-2 rounded-full bg-[#6fcf6f] mr-1"/>auto from submission</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1"/>manual entry</span>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          No students found
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 600 }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Student</th>
                    {SUBJECTS.map(s => (
                      <th key={s} className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide capitalize">{s}</th>
                    ))}
                    <th className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const average = avg(student.id)
                    return (
                      <tr key={student.id} className={`${i < students.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#6fcf6f]/20 flex items-center justify-center text-[#1a2e1a] text-[10px] font-bold flex-shrink-0">
                              {getInitials(student.name)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{student.roll_no}</div>
                            </div>
                          </div>
                        </td>
                        {SUBJECTS.map(subject => {
                          const mk = markMap[student.id]?.[subject]
                          const isEditing = editingCell?.studentId === student.id && editingCell?.subject === subject
                          return (
                            <td key={subject} className="px-2 py-2 text-center">
                              {!readOnly && isEditing ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input type="number" min="0" max="100" value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditingCell(null) }}
                                    autoFocus className="w-16 border border-[#6fcf6f] rounded px-2 py-1 text-xs text-center focus:outline-none"/>
                                  <button onClick={saveCell} disabled={saving} className="text-[10px] text-green-700 font-medium">{saving ? '…' : '✓'}</button>
                                  <button onClick={() => setEditingCell(null)} className="text-[10px] text-gray-400">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(student.id, subject)}
                                  disabled={readOnly}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors ${readOnly ? '' : 'hover:bg-gray-100'} ${gradeColor(mk?.percent ?? null)}`}
                                >
                                  {mk?.percent != null ? (
                                    <>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${mk.source === 'manual' ? 'bg-purple-400' : 'bg-[#6fcf6f]'}`}/>
                                      <span className="text-xs font-medium">{mk.percent}%</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </button>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-sm font-semibold ${gradeColor(average)}`}>
                            {average !== null ? `${average}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            {readOnly
              ? 'Read-only gradebook.'
              : 'Click any cell to edit · Enter to save · Esc to cancel'}
          </div>
        </>
      )}
    </div>
  )
}
