'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimetableForm, { type TimetableRow } from './TimetableForm'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri',
}
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

// Fixed palette for known subjects; unknown subjects get a neutral grey
const SUBJECT_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  urdu:     { bg: '#f5f0ff', border: '#ddd6fe', text: '#6d28d9' },
  english:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  math:     { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  science:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  islamiat: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
  pe:       { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  art:      { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf' },
  computer: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  history:  { bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
  geography:{ bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e' },
}

// Derive a consistent colour from a subject string not in the palette
const FALLBACK_COLORS = [
  { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  { bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
]
function getSubjectStyle(subject: string) {
  const key = subject.toLowerCase()
  if (SUBJECT_PALETTE[key]) return SUBJECT_PALETTE[key]
  // deterministic fallback based on char sum
  const sum = key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return FALLBACK_COLORS[sum % FALLBACK_COLORS.length]
}

type EditingCell = {
  day: string
  period: number
  existing: TimetableRow | null
  defaultClass: string
  defaultStage: string
}

export default function TimetableGrid({
  rows,
  teacherMap,
  isStaff,
  staffList,
}: {
  rows: TimetableRow[]
  teacherMap: Record<string, string>
  isStaff: boolean
  staffList: { user_id: string; role: string }[]
}) {
  const router = useRouter()
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)

  // Extract unique (class, stage) combos from data
  const classes = useMemo(() => {
    const seen = new Set<string>()
    const result: { class: string; stage: string }[] = []
    rows.forEach(r => {
      const key = `${r.class}||${r.stage}`
      if (!seen.has(key)) { seen.add(key); result.push({ class: r.class, stage: r.stage }) }
    })
    return result
  }, [rows])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const currentClass = classes[selectedIdx] ?? null

  // Build lookup: day → period → row, filtered to selected class
  const lookup = useMemo(() => {
    const map: Record<string, Record<number, TimetableRow>> = {}
    rows
      .filter(r => !currentClass || (r.class === currentClass.class && r.stage === currentClass.stage))
      .forEach(r => {
        if (!map[r.day]) map[r.day] = {}
        map[r.day][r.period] = r
      })
    return map
  }, [rows, currentClass])

  function openCell(day: string, period: number) {
    setEditingCell({
      day,
      period,
      existing: lookup[day]?.[period] ?? null,
      defaultClass: currentClass?.class ?? '',
      defaultStage: currentClass?.stage ?? '',
    })
  }

  function handleSaved() {
    setEditingCell(null)
    router.refresh()
  }

  const hasData = rows.length > 0

  return (
    <div>
      {/* Class selector — staff only */}
      {isStaff && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {classes.map((c, i) => (
            <button
              key={`${c.class}||${c.stage}`}
              onClick={() => setSelectedIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedIdx === i
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Class {c.class}
              {c.stage ? ` · ${c.stage}` : ''}
            </button>
          ))}
          {/* Button to create a slot for a brand-new class */}
          <button
            onClick={() =>
              setEditingCell({ day: 'Monday', period: 1, existing: null, defaultClass: '', defaultStage: '' })
            }
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243d24] transition-colors"
          >
            + New class
          </button>
        </div>
      )}

      {/* Empty state — student with no timetable */}
      {!isStaff && !hasData && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          No timetable has been set for your class yet
        </div>
      )}

      {/* Grid */}
      {(isStaff || hasData) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: 640, width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th
                    className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide border-r border-gray-50"
                    style={{ width: 56 }}
                  >
                    #
                  </th>
                  {DAYS.map(day => (
                    <th
                      key={day}
                      className="px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-center"
                    >
                      {DAY_SHORT[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pi) => (
                  <tr
                    key={period}
                    className={pi < PERIODS.length - 1 ? 'border-b border-gray-50' : ''}
                  >
                    {/* Period number */}
                    <td className="px-3 py-2 text-xs font-medium text-gray-300 text-center border-r border-gray-50 align-middle">
                      {period}
                    </td>

                    {DAYS.map(day => {
                      const row = lookup[day]?.[period]
                      const style = row ? getSubjectStyle(row.subject) : null
                      const teacherLabel = row?.teacher_id
                        ? (teacherMap[row.teacher_id] ?? 'staff')
                        : null

                      return (
                        <td
                          key={day}
                          className="px-2 py-2 align-top"
                          style={{ minWidth: 120 }}
                        >
                          {row ? (
                            /* Filled cell */
                            <div
                              className="rounded-lg p-2.5"
                              style={{
                                background: style!.bg,
                                border: `1px solid ${style!.border}`,
                              }}
                            >
                              <div
                                className="text-xs font-semibold capitalize leading-snug"
                                style={{ color: style!.text }}
                              >
                                {row.subject}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {row.start_time}–{row.end_time}
                              </div>
                              {teacherLabel && (
                                <div className="text-[10px] text-gray-400 capitalize mt-0.5">
                                  {teacherLabel}
                                </div>
                              )}
                              {isStaff && (
                                <button
                                  onClick={() => openCell(day, period)}
                                  className="mt-1.5 text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          ) : isStaff ? (
                            /* Empty cell — staff sees + */
                            <button
                              onClick={() => openCell(day, period)}
                              className="w-full rounded-lg flex items-center justify-center text-gray-300 hover:text-[#6fcf6f] hover:bg-[#6fcf6f]/5 transition-colors text-base font-light"
                              style={{ minHeight: 52 }}
                            >
                              +
                            </button>
                          ) : (
                            /* Empty cell — student sees dash */
                            <div className="flex items-center justify-center" style={{ minHeight: 52 }}>
                              <span className="text-gray-200 text-xs">—</span>
                            </div>
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

      {/* Edit / Add modal */}
      {editingCell && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/25 z-40"
            onClick={() => setEditingCell(null)}
          />
          {/* Centred modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <TimetableForm
              day={editingCell.day}
              period={editingCell.period}
              existing={editingCell.existing}
              defaultClass={editingCell.defaultClass}
              defaultStage={editingCell.defaultStage}
              staffList={staffList}
              onClose={() => setEditingCell(null)}
              onSaved={handleSaved}
            />
          </div>
        </>
      )}
    </div>
  )
}
