'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TimetableRow = {
  id: string
  class_num: number
  stage: string
  day: string
  period: number
  subject: string
  teacher_id: string | null
  instructor_name: string | null
  start_time: string
  end_time: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

export default function TimetableForm({
  day,
  period,
  existing,
  defaultClassNum,
  availableClasses,
  staffList,
  onClose,
  onSaved,
}: {
  day: string
  period: number
  existing: TimetableRow | null
  defaultClassNum: number | null
  availableClasses: number[]
  staffList: { user_id: string; role: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [classNum, setClassNum] = useState<string>(
    String(existing?.class_num ?? defaultClassNum ?? availableClasses[0] ?? '')
  )
  const [selectedDay, setSelectedDay] = useState(existing?.day ?? day)
  const [selectedPeriod, setSelectedPeriod] = useState(
    String(existing?.period ?? period)
  )
  const [subject, setSubject] = useState(existing?.subject ?? '')
  const [teacherId, setTeacherId] = useState(existing?.teacher_id ?? '')
  const [instructorName, setInstructorName] = useState(
    existing?.instructor_name ?? ''
  )
  const [startTime, setStartTime] = useState(existing?.start_time ?? '')
  const [endTime, setEndTime] = useState(existing?.end_time ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const supabase = useMemo(() => createClient(), [])

  async function handleSubmit() {
    if (!classNum || !subject.trim() || !startTime || !endTime) {
      setError('Class, subject, start time and end time are required.')
      return
    }

    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      class_num: Number(classNum),
      stage: existing?.stage ?? '',
      day: selectedDay,
      period: Number(selectedPeriod),
      subject: subject.trim(),
      teacher_id: teacherId || null,
      instructor_name: instructorName.trim() || null,
      start_time: startTime,
      end_time: endTime,
    }

    if (existing) {
      const movingToNewSlot =
        existing.class_num !== Number(classNum) ||
        existing.day !== selectedDay ||
        existing.period !== Number(selectedPeriod)

      if (movingToNewSlot) {
        const { data: clash, error: clashErr } = await supabase
          .from('timetable')
          .select('id')
          .eq('class_num', Number(classNum))
          .eq('day', selectedDay)
          .eq('period', Number(selectedPeriod))
          .neq('id', existing.id)
          .maybeSingle()

        if (clashErr) {
          setError(clashErr.message)
          setSaving(false)
          return
        }

        if (clash) {
          setError(
            'That class already has a period saved in this day/period slot.'
          )
          setSaving(false)
          return
        }
      }

      const { error: updateErr } = await supabase
        .from('timetable')
        .update(payload)
        .eq('id', existing.id)

      setSaving(false)

      if (updateErr) {
        setError(updateErr.message)
        return
      }

      setSaved(true)
      setTimeout(() => onSaved(), 500)
      return
    }

    const { data: clash, error: clashErr } = await supabase
      .from('timetable')
      .select('id')
      .eq('class_num', Number(classNum))
      .eq('day', selectedDay)
      .eq('period', Number(selectedPeriod))
      .maybeSingle()

    if (clashErr) {
      setError(clashErr.message)
      setSaving(false)
      return
    }

    if (clash) {
      setError(
        'That class already has a period in this day/period slot. Edit it instead.'
      )
      setSaving(false)
      return
    }

    const { error: insertErr } = await supabase.from('timetable').insert(payload)

    setSaving(false)

    if (insertErr) {
      setError(insertErr.message)
      return
    }

    setSaved(true)
    setTimeout(() => onSaved(), 500)
  }

  async function handleDelete() {
    if (!existing) return

    const confirmed = window.confirm(
      'Delete this timetable period? This cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    const { error: deleteErr } = await supabase
      .from('timetable')
      .delete()
      .eq('id', existing.id)

    setDeleting(false)

    if (deleteErr) {
      setError(deleteErr.message)
      return
    }

    onSaved()
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {existing ? 'Edit period' : 'Add period'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Simple and clean timetable entry for pilot use
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-gray-300 hover:text-gray-500 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Class Number
          </label>
          {availableClasses.length > 0 ? (
            <select
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              className={inputCls}
            >
              {availableClasses.map(c => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min="1"
              max="12"
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              placeholder="e.g. 9"
              className={inputCls}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Day
            </label>
            <select
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              className={inputCls}
            >
              {DAYS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Period
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className={inputCls}
            >
              {PERIODS.map(p => (
                <option key={p} value={p}>
                  Period {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Subject
          </label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Math, English, Urdu"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Assigned Staff
          </label>
          <select
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
            className={inputCls}
          >
            <option value="">Unassigned</option>
            {staffList.map(s => (
              <option key={s.user_id} value={s.user_id}>
                {s.role.charAt(0).toUpperCase() + s.role.slice(1)} (···
                {s.user_id.slice(-6)})
              </option>
            ))}
          </select>
          <div className="text-[10px] text-gray-400 mt-1">
            Teacher or admin can be linked here for internal assignment.
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Instructor Name Shown on Timetable
          </label>
          <input
            value={instructorName}
            onChange={e => setInstructorName(e.target.value)}
            placeholder="e.g. Sir Ahmed, Miss Sana"
            className={inputCls}
          />
          <div className="text-[10px] text-gray-400 mt-1">
            This is the display name students will see on the timetable and print view.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-50 flex justify-between items-center">
        <div>
          {existing && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete period'}
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || deleting || saved}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saved
              ? 'Saved ✓'
              : saving
                ? 'Saving...'
                : existing
                  ? 'Save changes'
                  : 'Add period'}
          </button>
        </div>
      </div>
    </div>
  )
}