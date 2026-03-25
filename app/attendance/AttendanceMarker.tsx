'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Student = { id: string; name: string; roll_no: string; stage: string; class_num: number }
type StatusMap = Record<string, 'present' | 'absent'>

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
  const [status, setStatus] = useState<StatusMap>(initialStatus)
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  function toggle(id: string) {
    setStatus(prev => ({ ...prev, [id]: prev[id] === 'present' ? 'absent' : 'present' }))
  }

  async function handleSave() {
    setSaving(true)
    const rows = students.map(s => ({
      student_id: s.id,
      day: today,
      status: status[s.id] ?? 'absent',
    }))
    const { error: err } = await supabase.from('attendance_logs').upsert(rows, { onConflict: 'student_id,day' })
    setSaving(false)
    if (err) {
      toast.error('Failed to save attendance. Please try again.')
      return
    }
    toast.success('Attendance saved!')
  }

  const presentCount = Object.values(status).filter(s => s === 'present').length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">{presentCount} / {students.length} present</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save attendance'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {students.length > 0 ? students.map((student, i) => {
          const s = status[student.id] ?? 'absent'
          return (
            <div
              key={student.id}
              className={`px-5 py-3.5 flex items-center gap-3 ${i < students.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[10px] font-semibold flex-shrink-0">
                {getInitials(student.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                <div className="text-[10px] text-gray-400">{student.roll_no} · Stage {student.stage}, Class {student.class_num}</div>
              </div>
              <button
                onClick={() => toggle(student.id)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                  s === 'present'
                    ? 'bg-green-50 text-green-800 hover:bg-green-100'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {s === 'present' ? 'Present' : 'Absent'}
              </button>
            </div>
          )
        }) : (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No students found</div>
        )}
      </div>
    </div>
  )
}
