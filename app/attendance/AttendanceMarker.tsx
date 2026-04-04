'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export type Student = {
  id: string
  name: string
  roll_no: string
  stage: string
  class_num: number
}

type MarkStatus = 'present' | 'absent'
type StatusMap  = Record<string, MarkStatus>

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AttendanceMarker({
  students,
  initialStatus,
  today,
}: {
  students: Student[]
  initialStatus: StatusMap
  today: string
}) {
  const [status, setStatus]   = useState<StatusMap>(initialStatus)
  const [saving, setSaving]   = useState(false)
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const supabase = useMemo(() => createClient(), [])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const classNums = useMemo(() => {
    const set = new Set<number>()
    students.forEach(s => { if (s.class_num) set.add(s.class_num) })
    return Array.from(set).sort((a, b) => a - b)
  }, [students])

  const visibleStudents = useMemo(() => {
    if (classFilter === 'all') return students
    return students.filter(s => s.class_num === classFilter)
  }, [students, classFilter])

  const hasAnyLogsToday = Object.keys(initialStatus).length > 0

  const presentCount = visibleStudents.filter(s => status[s.id] === 'present').length
  const markedCount  = visibleStudents.filter(s => status[s.id] !== undefined).length

  // ── Actions ───────────────────────────────────────────────────────────────────
  function toggle(id: string) {
    setStatus(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present',
    }))
  }

  function markAllPresent() {
    const updates: StatusMap = {}
    visibleStudents.forEach(s => { updates[s.id] = 'present' })
    setStatus(prev => ({ ...prev, ...updates }))
  }

  function markAllAbsent() {
    const updates: StatusMap = {}
    visibleStudents.forEach(s => { updates[s.id] = 'absent' })
    setStatus(prev => ({ ...prev, ...updates }))
  }

  async function handleSave() {
    setSaving(true)
    const rows = students.map(s => ({
      student_id: s.id,
      day:        today,
      status:     status[s.id] ?? 'absent',
    }))
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(rows, { onConflict: 'student_id,day' })
    setSaving(false)
    if (error) {
      toast.error('Failed to save attendance. Please try again.')
      return
    }
    toast.success('Attendance saved!')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
        <div className="text-sm font-medium text-gray-900 mb-1">No students found</div>
        <div className="text-xs text-gray-400">
          Add students via the Admin Panel before marking attendance.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Class filter + summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Class filter buttons */}
        {classNums.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setClassFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                classFilter === 'all'
                  ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              All classes
            </button>
            {classNums.map(n => (
              <button
                key={n}
                onClick={() => setClassFilter(n)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  classFilter === n
                    ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                Class {n}
              </button>
            ))}
          </div>
        )}

        {/* Counter + save */}
        <div className="flex items-center gap-3 ml-auto">
          <p className="text-xs text-gray-400 whitespace-nowrap">
            {hasAnyLogsToday
              ? `${presentCount} / ${visibleStudents.length} present`
              : `${markedCount} / ${visibleStudents.length} marked`}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px] whitespace-nowrap"
          >
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={markAllPresent}
          className="text-xs font-medium px-3.5 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors min-h-[36px]"
        >
          Mark all present
        </button>
        <button
          onClick={markAllAbsent}
          className="text-xs font-medium px-3.5 py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors min-h-[36px]"
        >
          Mark all absent
        </button>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {visibleStudents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No students in this class
          </div>
        ) : (
          visibleStudents.map((student, i) => {
            const s          = status[student.id]
            const isMarked   = s !== undefined
            const isPresent  = s === 'present'
            const isAbsent   = s === 'absent'

            return (
              <div
                key={student.id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  i < visibleStudents.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                  {getInitials(student.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 leading-tight">
                    {student.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {student.roll_no} · Class {student.class_num}
                  </div>
                </div>

                <button
                  onClick={() => toggle(student.id)}
                  className={`flex-shrink-0 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors min-h-[44px] min-w-[88px] ${
                    isPresent
                      ? 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200'
                      : isAbsent
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {isPresent ? 'Present' : isAbsent ? 'Absent' : 'Mark'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom save button — visible without scrolling on mobile */}
      <div className="sm:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-3.5 rounded-lg disabled:opacity-50 transition-colors min-h-[52px]"
        >
          {saving ? 'Saving…' : `Save attendance (${markedCount} marked)`}
        </button>
      </div>
    </div>
  )
}
