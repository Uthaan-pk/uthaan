'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { LeaveStatus } from '@/lib/attendanceLeaves'
import { writeAuditLog } from '@/lib/audit'

export type Student = {
  id: string
  name: string
  roll_no: string
  stage: string
  class_num: number
}

type MarkStatus = 'present' | 'absent' | 'late' | LeaveStatus
type StatusMap = Record<string, MarkStatus>
type LeaveMeta = Record<string, { label: string; reason: string | null }>

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AttendanceMarker({
  students,
  initialStatus,
  today,
  schoolId = null,
  readOnly = false,
  lockedStatusByStudent = {},
  leaveMeta = {},
}: {
  students: Student[]
  initialStatus: StatusMap
  today: string
  schoolId?: string | null
  readOnly?: boolean
  lockedStatusByStudent?: Record<string, LeaveStatus>
  leaveMeta?: LeaveMeta
}) {
  const [status, setStatus] = useState<StatusMap>(initialStatus)
  const [saving, setSaving] = useState(false)
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const supabase = useMemo(() => createClient(), [])
  // Track the current user's id to distinguish self-saves from remote changes
  const myUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Get current user id to avoid showing "updated by another teacher" for own saves
    supabase.auth.getUser().then(({ data }) => {
      myUserIdRef.current = data.user?.id ?? null
    })
  }, [supabase])

  useEffect(() => {
    if (!schoolId) return

    const studentIdSet = new Set(students.map((s) => s.id))

    const channel = supabase
      .channel(`attendance:${schoolId}:${today}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            student_id?: string
            day?: string
            status?: string
          } | null
          if (!row?.student_id || row.day !== today) return
          if (!studentIdSet.has(row.student_id)) return

          const newStatus = row.status as MarkStatus | undefined
          if (!newStatus) return

          setStatus((prev) => {
            // Skip if our local state already matches (prevents echo from own saves)
            if (prev[row.student_id!] === newStatus) return prev
            return { ...prev, [row.student_id!]: newStatus }
          })

          toast('Updated by another teacher', {
            icon: '🔄',
            style: { fontSize: '12px' },
            duration: 2500,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, schoolId, today, students])

  const classNums = useMemo(() => {
    const set = new Set<number>()
    students.forEach(s => {
      if (s.class_num) set.add(s.class_num)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [students])

  const visibleStudents = useMemo(() => {
    if (classFilter === 'all') return students
    return students.filter(s => s.class_num === classFilter)
  }, [students, classFilter])

  const presentCount = visibleStudents.filter(s => status[s.id] === 'present').length
  const lateCount = visibleStudents.filter(s => status[s.id] === 'late').length
  const excusedCount = visibleStudents.filter(s => status[s.id] === 'excused').length
  const earlyLeaveCount = visibleStudents.filter(s => status[s.id] === 'early_leave').length
  const markedCount = visibleStudents.filter(s => status[s.id] !== undefined).length

  function isLocked(id: string) {
    return !!lockedStatusByStudent[id]
  }

  function setStudentStatus(id: string, next: 'present' | 'absent' | 'late') {
    if (readOnly || isLocked(id)) return
    setStatus(prev => ({
      ...prev,
      [id]: next,
    }))
  }

  function markAll(next: 'present' | 'absent' | 'late') {
    if (readOnly) return
    const updates: StatusMap = {}
    visibleStudents.forEach(s => {
      if (!isLocked(s.id)) {
        updates[s.id] = next
      }
    })
    setStatus(prev => ({ ...prev, ...updates }))
  }

  async function handleSave() {
    if (readOnly) return

    if (visibleStudents.length === 0) {
      toast.error('No students in the selected class.')
      return
    }

    if (classNums.length > 1 && classFilter === 'all') {
      toast.error('Select a class before saving attendance.')
      return
    }

    const unmarked = visibleStudents.filter(
      s => status[s.id] === undefined && !isLocked(s.id)
    )
    if (unmarked.length > 0) {
      toast.error('Mark every student in the selected class before saving.')
      return
    }

    setSaving(true)

    const rows = visibleStudents
      .filter(s => !isLocked(s.id))
      .map(s => ({
        student_id: s.id,
        day: today,
        status: status[s.id],
        school_id: schoolId,
      }))
      .filter(row => row.status !== undefined)

    const { error } = await supabase
      .from('attendance_logs')
      .upsert(rows, { onConflict: 'student_id,day' })

    setSaving(false)

    if (error) {
      toast.error(error.message || 'Failed to save attendance. Please try again.')
      return
    }

    await writeAuditLog(supabase, {
      actor_user_id: myUserIdRef.current,
      action: 'update',
      entity_type: 'attendance',
      entity_id: today,
      new_value: {
        date: today,
        count: rows.length,
        class: classFilter !== 'all' ? classFilter : 'all',
      },
    })

    toast.success('Attendance saved!')
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
        <div className="text-sm font-medium text-gray-900 mb-1">
          No students found
        </div>
        <div className="text-xs text-gray-400">
          Add students via the Admin Panel before marking attendance.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
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

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-green-100 bg-green-50 px-2.5 py-1 font-medium text-green-700">
                {presentCount} present
              </span>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                {lateCount} late
              </span>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
                {excusedCount} excused
              </span>
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                {earlyLeaveCount} early leave
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-600">
                {markedCount} / {visibleStudents.length} marked
              </span>
            </div>
          </div>

          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px] whitespace-nowrap xl:self-start"
            >
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          )}
        </div>
      </div>

      {readOnly ? (
        <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3">
          Admin view is read-only. Teachers are the only role allowed to take attendance.
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => markAll('present')}
            className="text-xs font-medium px-3.5 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors min-h-[36px]"
          >
            Mark all present
          </button>
          <button
            onClick={() => markAll('late')}
            className="text-xs font-medium px-3.5 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors min-h-[36px]"
          >
            Mark all late
          </button>
          <button
            onClick={() => markAll('absent')}
            className="text-xs font-medium px-3.5 py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors min-h-[36px]"
          >
            Mark all absent
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="hidden border-b border-gray-100 bg-gray-50/80 px-5 py-3 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(320px,380px)] md:items-center md:gap-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Student
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 md:text-right">
            Attendance status
          </div>
        </div>
        {visibleStudents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No students in this class
          </div>
        ) : (
          visibleStudents.map((student, i) => {
            const current = status[student.id]
            const locked = isLocked(student.id)
            const meta = leaveMeta[student.id]

            return (
              <div
                key={student.id}
                className={`px-4 py-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(320px,380px)] md:items-center md:gap-4 ${
                  i < visibleStudents.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                    {getInitials(student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 leading-tight">
                      {student.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      Roll {student.roll_no} · Class {student.class_num}
                      {student.stage ? ` · ${student.stage}` : ''}
                    </div>
                    {meta && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                          {meta.label}
                        </span>
                        {meta.reason && (
                          <span className="text-[10px] text-gray-400">{meta.reason}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 md:ml-auto md:max-w-[380px] md:grid-cols-3">
                  {locked ? (
                    <span className={`col-span-2 md:col-span-3 text-xs font-semibold px-3 py-2 rounded-lg border min-h-[40px] inline-flex items-center justify-center ${
                      current === 'excused'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {current === 'excused' ? 'Excused' : 'Early leave'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setStudentStatus(student.id, 'present')}
                        disabled={readOnly}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg border min-h-[40px] transition-colors ${
                          current === 'present'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-green-200 hover:text-green-700'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        Present
                      </button>

                      <button
                        onClick={() => setStudentStatus(student.id, 'late')}
                        disabled={readOnly}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg border min-h-[40px] transition-colors ${
                          current === 'late'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-700'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        Late
                      </button>

                      <button
                        onClick={() => setStudentStatus(student.id, 'absent')}
                        disabled={readOnly}
                        className={`col-span-2 md:col-span-1 text-xs font-semibold px-3 py-2 rounded-lg border min-h-[40px] transition-colors ${
                          current === 'absent'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-700'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        Absent
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {!readOnly && (
        <div className="sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-3.5 rounded-lg disabled:opacity-50 transition-colors min-h-[52px]"
          >
            {saving ? 'Saving…' : `Save attendance (${markedCount} marked)`}
          </button>
        </div>
      )}
    </div>
  )
}
