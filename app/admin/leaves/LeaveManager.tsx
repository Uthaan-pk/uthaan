'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { earlyLeaveOnDay, leaveCoversDay, readLeaveReason } from '@/lib/attendanceLeaves'

type StudentOption = {
  id: string
  name: string
  roll_no: string
  class_num: number | null
}

type LeaveRow = Record<string, unknown>

function studentLabel(s: StudentOption) {
  return `${s.name} (${s.roll_no})${s.class_num ? ` · Class ${s.class_num}` : ''}`
}

function normalizeDate(value: unknown): string {
  const raw = String(value ?? '')
  return raw.slice(0, 10)
}

function fullDayRangeLabel(row: LeaveRow) {
  const start = normalizeDate(
    row.start_date ?? row.from_date ?? row.date ?? row.leave_date
  )
  const end = normalizeDate(row.end_date ?? row.to_date ?? row.until_date ?? start)

  if (!start) return 'Date not set'
  if (!end || start === end) return start
  return `${start} → ${end}`
}

function earlyLeaveDateLabel(row: LeaveRow) {
  const day = normalizeDate(row.leave_date ?? row.date ?? row.early_leave_date)
  return day || 'Date not set'
}

export default function LeaveManager({
  students,
  initialLeaves,
  initialEarlyLeaves,
}: {
  students: StudentOption[]
  initialLeaves: LeaveRow[]
  initialEarlyLeaves: LeaveRow[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [leaves, setLeaves] = useState<LeaveRow[]>(initialLeaves)
  const [earlyLeaves, setEarlyLeaves] = useState<LeaveRow[]>(initialEarlyLeaves)

  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [day, setDay] = useState('')
  const [earlyReason, setEarlyReason] = useState('')

  const [savingLeave, setSavingLeave] = useState(false)
  const [savingEarly, setSavingEarly] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const studentMap = useMemo(() => {
    const map: Record<string, StudentOption> = {}
    students.forEach(s => {
      map[s.id] = s
    })
    return map
  }, [students])

  const today = new Date().toISOString().slice(0, 10)
  const todaysLeaves = leaves.filter(row => leaveCoversDay(row, today)).length
  const todaysEarlyLeaves = earlyLeaves.filter(row => earlyLeaveOnDay(row, today)).length

  async function tryInsert(
    table: 'student_leaves' | 'student_early_leaves',
    payloads: Record<string, unknown>[]
  ) {
    let lastError: { message?: string } | null = null

    for (const payload of payloads) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) return data
      lastError = error
    }

    throw new Error(lastError?.message ?? 'Failed to save leave record.')
  }

  async function addLeave() {
    if (!studentId || !startDate) {
      toast.error('Select a student and start date.')
      return
    }

    const resolvedEnd = endDate || startDate
    if (resolvedEnd < startDate) {
      toast.error('End date cannot be before start date.')
      return
    }

    setSavingLeave(true)
    try {
      const data = await tryInsert('student_leaves', [
        {
          student_id: studentId,
          start_date: startDate,
          end_date: resolvedEnd,
          reason: reason || null,
        },
      ])

      setLeaves(prev => [data, ...prev])
      setStartDate('')
      setEndDate('')
      setReason('')
      toast.success('Full-day leave approved.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add leave.'
      toast.error(message)
    } finally {
      setSavingLeave(false)
    }
  }

  async function addEarlyLeave() {
    if (!studentId || !day) {
      toast.error('Select a student and date.')
      return
    }

    setSavingEarly(true)
    try {
      const data = await tryInsert('student_early_leaves', [
        {
          student_id: studentId,
          leave_date: day,
          reason: earlyReason || null,
        },
      ])

      setEarlyLeaves(prev => [data, ...prev])
      setDay('')
      setEarlyReason('')
      toast.success('Early leave approved.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add early leave.'
      toast.error(message)
    } finally {
      setSavingEarly(false)
    }
  }

  async function removeLeave(table: 'student_leaves' | 'student_early_leaves', id: string) {
    setDeletingId(id)

    const { error } = await supabase.from(table).delete().eq('id', id)

    setDeletingId(null)
    if (error) {
      toast.error(error.message || 'Failed to delete record.')
      return
    }

    if (table === 'student_leaves') {
      setLeaves(prev => prev.filter(row => String(row.id) !== id))
    } else {
      setEarlyLeaves(prev => prev.filter(row => String(row.id) !== id))
    }

    toast.success('Leave record removed.')
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Today</div>
          <div className="text-lg font-semibold text-gray-900">{today}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Full-day leave</div>
          <div className="text-lg font-semibold text-gray-900">{todaysLeaves}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Early leave</div>
          <div className="text-lg font-semibold text-gray-900">{todaysEarlyLeaves}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Approve full-day leave</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Creates an excused attendance status for the approved date range.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Student
            </label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {studentLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Reason (optional)
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Medical, family event, travel, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={addLeave}
              disabled={savingLeave || students.length === 0}
              className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {savingLeave ? 'Saving…' : 'Approve leave'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Approve early leave</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Marks the selected day as early leave in attendance.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Student
            </label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {studentLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={day}
              onChange={e => setDay(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Reason (optional)
            </label>
            <input
              value={earlyReason}
              onChange={e => setEarlyReason(e.target.value)}
              placeholder="Appointment, emergency, transport issue, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={addEarlyLeave}
              disabled={savingEarly || students.length === 0}
              className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {savingEarly ? 'Saving…' : 'Approve early leave'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Approved full-day leaves</h3>
          </div>

          {leaves.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-400 text-center">No full-day leaves yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto">
              {leaves.map(row => {
                const id = String(row.id ?? '')
                const student = studentMap[String(row.student_id)]
                return (
                  <div key={id || `${row.student_id}-${fullDayRangeLabel(row)}`} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student ? studentLabel(student) : String(row.student_id)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{fullDayRangeLabel(row)}</div>
                        {readLeaveReason(row) && (
                          <div className="text-xs text-gray-400 mt-1">{readLeaveReason(row)}</div>
                        )}
                      </div>
                      {id && (
                        <button
                          onClick={() => removeLeave('student_leaves', id)}
                          disabled={deletingId === id}
                          className="text-xs text-red-600 hover:text-red-700 border border-red-100 hover:border-red-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                        >
                          {deletingId === id ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Approved early leaves</h3>
          </div>

          {earlyLeaves.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-400 text-center">No early leaves yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto">
              {earlyLeaves.map(row => {
                const id = String(row.id ?? '')
                const student = studentMap[String(row.student_id)]
                return (
                  <div key={id || `${row.student_id}-${earlyLeaveDateLabel(row)}`} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student ? studentLabel(student) : String(row.student_id)}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{earlyLeaveDateLabel(row)}</div>
                        {readLeaveReason(row) && (
                          <div className="text-xs text-gray-400 mt-1">{readLeaveReason(row)}</div>
                        )}
                      </div>
                      {id && (
                        <button
                          onClick={() => removeLeave('student_early_leaves', id)}
                          disabled={deletingId === id}
                          className="text-xs text-red-600 hover:text-red-700 border border-red-100 hover:border-red-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                        >
                          {deletingId === id ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
