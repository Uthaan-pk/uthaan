'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TimetableRow = {
  id: string
  class: string
  stage: string
  day: string
  period: number
  subject: string
  teacher_id: string | null
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
  defaultClass,
  defaultStage,
  staffList,
  onClose,
  onSaved,
}: {
  day: string
  period: number
  existing: TimetableRow | null
  defaultClass: string
  defaultStage: string
  staffList: { user_id: string; role: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [cls, setCls] = useState(existing?.class ?? defaultClass)
  const [stage, setStage] = useState(existing?.stage ?? defaultStage)
  const [selectedDay, setSelectedDay] = useState(existing?.day ?? day)
  const [selectedPeriod, setSelectedPeriod] = useState(String(existing?.period ?? period))
  const [subject, setSubject] = useState(existing?.subject ?? '')
  const [teacherId, setTeacherId] = useState(existing?.teacher_id ?? '')
  const [startTime, setStartTime] = useState(existing?.start_time ?? '')
  const [endTime, setEndTime] = useState(existing?.end_time ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  async function handleSubmit() {
    if (!cls.trim() || !subject.trim() || !startTime || !endTime) {
      setError('Class, subject, start time and end time are required.')
      return
    }
    setSaving(true)
    setError('')

    // When editing, delete the old row first so key changes work cleanly
    if (existing) {
      const { error: delErr } = await supabase
        .from('timetable')
        .delete()
        .eq('id', existing.id)
      if (delErr) {
        setError(delErr.message)
        setSaving(false)
        return
      }
    }

    const { error: err } = await supabase.from('timetable').upsert(
      {
        class: cls.trim(),
        stage: stage.trim(),
        day: selectedDay,
        period: Number(selectedPeriod),
        subject: subject.trim().toLowerCase(),
        teacher_id: teacherId || null,
        start_time: startTime,
        end_time: endTime,
      },
      { onConflict: 'class,day,period' }
    )

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved(true)
    setTimeout(() => onSaved(), 700)
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          {existing ? 'Edit period' : 'Add period'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-gray-500 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Class + Stage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Class
            </label>
            <input
              value={cls}
              onChange={e => setCls(e.target.value)}
              placeholder="e.g. 5A"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Stage
            </label>
            <input
              value={stage}
              onChange={e => setStage(e.target.value)}
              placeholder="e.g. Primary"
              className={inputCls}
            />
          </div>
        </div>

        {/* Day + Period */}
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
                <option key={d} value={d}>{d}</option>
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
                <option key={p} value={p}>Period {p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject */}
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

        {/* Teacher */}
        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Teacher
          </label>
          <select
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
            className={inputCls}
          >
            <option value="">Unassigned</option>
            {staffList.map(s => (
              <option key={s.user_id} value={s.user_id}>
                {s.role.charAt(0).toUpperCase() + s.role.slice(1)} (···{s.user_id.slice(-6)})
              </option>
            ))}
          </select>
        </div>

        {/* Start + End time */}
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

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || saved}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : existing ? 'Save changes' : 'Add period'}
        </button>
      </div>
    </div>
  )
}
