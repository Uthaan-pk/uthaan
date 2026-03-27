'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimetableForm, { type TimetableRow } from './TimetableForm'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' }
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const SUBJECT_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  urdu:      { bg: '#f5f0ff', border: '#ddd6fe', text: '#6d28d9' },
  english:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  math:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  science:   { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  islamiat:  { bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
  pe:        { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  art:       { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf' },
  computer:  { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  history:   { bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
  geography: { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e' },
}
const FALLBACK = [
  { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
]
function subjectStyle(s: string) {
  const k = s.toLowerCase()
  if (SUBJECT_PALETTE[k]) return SUBJECT_PALETTE[k]
  const sum = k.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return FALLBACK[sum % FALLBACK.length]
}

type EditCell = { day: string; period: number; existing: TimetableRow | null; defaultClassNum: number | null }

export default function TimetableGrid({
  rows, teacherMap, currentUserId, currentRole, staffList, availableClasses,
}: {
  rows: TimetableRow[]
  teacherMap: Record<string, string>
  currentUserId: string
  currentRole: string
  staffList: { user_id: string; role: string }[]
  availableClasses: number[]
}) {
  const isStaff = currentRole === 'teacher' || currentRole === 'admin'
  const router = useRouter()
  const [editCell, setEditCell] = useState<EditCell | null>(null)

  const classNums = useMemo(() => {
    const fromRows = rows.map(r => r.class_num)
    return [...new Set([...availableClasses, ...fromRows])].sort((a, b) => a - b)
  }, [rows, availableClasses])

  const [selectedClass, setSelectedClass] = useState<number | null>(classNums[0] ?? null)

  const lookup = useMemo(() => {
    const map: Record<string, Record<number, TimetableRow>> = {}
    rows.filter(r => selectedClass === null || r.class_num === selectedClass).forEach(r => {
      if (!map[r.day]) map[r.day] = {}
      map[r.day][r.period] = r
    })
    return map
  }, [rows, selectedClass])

  function openCell(day: string, period: number) {
    setEditCell({ day, period, existing: lookup[day]?.[period] ?? null, defaultClassNum: selectedClass })
  }

  function handleSaved() {
    setEditCell(null)
    router.refresh()
  }

  return (
    <div>
      {isStaff && classNums.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {classNums.map(cn => (
            <button key={cn} onClick={() => setSelectedClass(cn)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedClass === cn ? 'bg-[#1a2e1a] text-[#6fcf6f]' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
              Class {cn}
            </button>
          ))}
          {currentRole === 'admin' && (
            <button onClick={() => setEditCell({ day: 'Monday', period: 1, existing: null, defaultClassNum: selectedClass })}
              className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243d24] transition-colors">
              + Add period
            </button>
          )}
        </div>
      )}

      {isStaff && classNums.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center space-y-3">
          <p className="text-sm text-gray-400">No timetable entries yet.</p>
          {currentRole === 'admin' && (
            <button onClick={() => setEditCell({ day: 'Monday', period: 1, existing: null, defaultClassNum: null })}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243d24] transition-colors">
              + Add first period
            </button>
          )}
        </div>
      )}

      {!isStaff && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          No timetable has been set for your class yet.
        </div>
      )}

      {(isStaff ? selectedClass !== null && classNums.length > 0 : rows.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: 640, width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide border-r border-gray-50" style={{ width: 56 }}>#</th>
                  {DAYS.map(d => <th key={d} className="px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-center">{DAY_SHORT[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pi) => (
                  <tr key={period} className={pi < PERIODS.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-300 text-center border-r border-gray-50 align-middle">{period}</td>
                    {DAYS.map(day => {
                      const row = lookup[day]?.[period]
                      const sty = row ? subjectStyle(row.subject) : null
                      const tLabel = row?.teacher_id ? (teacherMap[row.teacher_id] ?? 'staff') : null
                      return (
                        <td key={day} className="px-2 py-2 align-top" style={{ minWidth: 120 }}>
                          {row ? (
                            <div className="rounded-lg p-2.5" style={{ background: sty!.bg, border: `1px solid ${sty!.border}` }}>
                              <div className="text-xs font-semibold capitalize leading-snug" style={{ color: sty!.text }}>{row.subject}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{row.start_time}&#8211;{row.end_time}</div>
                              {tLabel && <div className="text-[10px] text-gray-400 capitalize mt-0.5">{tLabel}</div>}
                              {(currentRole === 'admin' || (currentRole === 'teacher' && row.teacher_id === currentUserId)) && (
                                <button onClick={() => openCell(day, period)} className="mt-1.5 text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors">Edit</button>
                              )}
                            </div>
                          ) : currentRole === 'admin' ? (
                            <button onClick={() => openCell(day, period)} className="w-full rounded-lg flex items-center justify-center text-gray-300 hover:text-[#6fcf6f] hover:bg-[#6fcf6f]/5 transition-colors text-base font-light" style={{ minHeight: 52 }}>+</button>
                          ) : (
                            <div className="flex items-center justify-center" style={{ minHeight: 52 }}><span className="text-gray-200 text-xs">&#8212;</span></div>
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

      {editCell && (
        <>
          <div className="fixed inset-0 bg-black/25 z-40" onClick={() => setEditCell(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <TimetableForm
              day={editCell.day}
              period={editCell.period}
              existing={editCell.existing}
              defaultClassNum={editCell.defaultClassNum}
              availableClasses={classNums}
              staffList={staffList}
              onClose={() => setEditCell(null)}
              onSaved={handleSaved}
            />
          </div>
        </>
      )}
    </div>
  )
}
