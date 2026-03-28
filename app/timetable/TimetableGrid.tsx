'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import TimetableForm, { type TimetableRow } from './TimetableForm'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
}
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const SUBJECT_PALETTE: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  urdu: { bg: '#f5f0ff', border: '#ddd6fe', text: '#6d28d9' },
  english: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  math: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  science: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  islamiat: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
  pe: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  art: { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf' },
  computer: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  history: { bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
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

type EditCell = {
  day: string
  period: number
  existing: TimetableRow | null
  defaultClassNum: number | null
}

export default function TimetableGrid({
  rows,
  teacherMap,
  currentUserId,
  currentRole,
  staffList,
  availableClasses,
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

  const [selectedClass, setSelectedClass] = useState<number | null>(
    classNums[0] ?? null
  )

  const lookup = useMemo(() => {
    const map: Record<string, Record<number, TimetableRow>> = {}
    rows
      .filter(r => selectedClass === null || r.class_num === selectedClass)
      .forEach(r => {
        if (!map[r.day]) map[r.day] = {}
        map[r.day][r.period] = r
      })
    return map
  }, [rows, selectedClass])

  function openCell(day: string, period: number) {
    setEditCell({
      day,
      period,
      existing: lookup[day]?.[period] ?? null,
      defaultClassNum: selectedClass,
    })
  }

  function handleSaved() {
    setEditCell(null)
    router.refresh()
  }

  function buildPrintHtml() {
    const safeClassLabel = selectedClass ? `Class ${selectedClass}` : 'Timetable'
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const headerCells = DAYS.map(day => `<th>${DAY_SHORT[day]}</th>`).join('')

    const bodyRows = PERIODS.map(period => {
      const cells = DAYS.map(day => {
        const row = lookup[day]?.[period]

        if (!row) {
          return `
            <td class="empty-cell">
              <div class="empty">—</div>
            </td>
          `
        }

        const instructor = row.teacher_id
          ? (teacherMap[row.teacher_id] ?? 'Instructor')
          : 'Unassigned'

        return `
          <td>
            <div class="entry">
              <div class="subject">${row.subject}</div>
              <div class="time">${row.start_time} – ${row.end_time}</div>
              <div class="teacher">${instructor}</div>
            </div>
          </td>
        `
      }).join('')

      return `
        <tr>
          <td class="period">${period}</td>
          ${cells}
        </tr>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeClassLabel} Timetable</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
              background: #ffffff;
            }

            .page {
              width: 100%;
            }

            .topbar {
              background: #1a2e1a;
              color: #ffffff;
              padding: 18px 20px 16px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }

            .school {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #6fcf6f;
              margin-bottom: 6px;
            }

            .title {
              font-size: 11px;
              letter-spacing: 1.4px;
              text-transform: uppercase;
              color: #ffffff;
            }

            .meta-box {
              border: 1px solid #d6d3d1;
              border-top: 0;
              background: #f8f7f4;
              padding: 14px 18px;
              margin-bottom: 16px;
            }

            .meta-grid {
              width: 100%;
              border-collapse: collapse;
            }

            .meta-grid td {
              padding: 2px 0;
              border: 0;
              font-size: 11px;
              vertical-align: top;
            }

            .meta-label {
              font-weight: 700;
              color: #374151;
              width: 110px;
            }

            .meta-value {
              color: #111827;
            }

            .table-wrap {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              overflow: hidden;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            thead th {
              background: #1a2e1a;
              color: #6fcf6f;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              padding: 10px 8px;
              border-right: 1px solid #2f4630;
              text-align: center;
            }

            thead th:last-child {
              border-right: 0;
            }

            tbody td {
              border-right: 1px solid #d1d5db;
              border-top: 1px solid #d1d5db;
              padding: 8px 6px;
              height: 84px;
              text-align: center;
              vertical-align: middle;
              background: #ffffff;
            }

            tbody tr td:last-child {
              border-right: 0;
            }

            .period {
              width: 52px;
              font-weight: 700;
              font-size: 12px;
              color: #1f2937;
              background: #f8f7f4;
            }

            .entry {
              min-height: 64px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 4px 3px;
            }

            .subject {
              font-size: 13px;
              font-weight: 700;
              color: #1a2e1a;
              text-transform: capitalize;
              line-height: 1.2;
            }

            .time {
              font-size: 10px;
              color: #4b5563;
              line-height: 1.2;
            }

            .teacher {
              font-size: 10px;
              color: #6b7280;
              line-height: 1.2;
              text-transform: capitalize;
            }

            .empty-cell {
              background: #fcfcfb;
            }

            .empty {
              color: #c0c4cc;
              font-size: 14px;
              font-weight: 500;
            }

            .footer {
              margin-top: 14px;
              background: #1a2e1a;
              color: #6fcf6f;
              text-align: center;
              padding: 8px 10px;
              font-size: 9px;
              font-style: italic;
              border-radius: 0 0 8px 8px;
            }

            .note {
              margin-top: 8px;
              text-align: right;
              font-size: 9px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="topbar">
              <div class="school">UTHAAN SCHOOL MANAGEMENT SYSTEM</div>
              <div class="title">Official Weekly Timetable</div>
            </div>

            <div class="meta-box">
              <table class="meta-grid">
                <tr>
                  <td class="meta-label">Class:</td>
                  <td class="meta-value">${safeClassLabel}</td>
                  <td class="meta-label">Generated:</td>
                  <td class="meta-value">${today}</td>
                </tr>
                <tr>
                  <td class="meta-label">Document Type:</td>
                  <td class="meta-value">Weekly Academic Timetable</td>
                  <td class="meta-label">System:</td>
                  <td class="meta-value">Uthaan</td>
                </tr>
              </table>
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:52px">#</th>
                    ${headerCells}
                  </tr>
                </thead>
                <tbody>
                  ${bodyRows}
                </tbody>
              </table>
            </div>

            <div class="note">
              For official school use
            </div>

            <div class="footer">
              Generated by Uthaan — The future of Pakistani education
            </div>
          </div>
        </body>
      </html>
    `
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    const html = buildPrintHtml()
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  return (
    <div>
      {isStaff && classNums.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {classNums.map(cn => (
            <button
              key={cn}
              onClick={() => setSelectedClass(cn)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedClass === cn
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Class {cn}
            </button>
          ))}

          <button
            onClick={handlePrint}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
          >
            Print timetable
          </button>

          <button
            onClick={() =>
              setEditCell({
                day: 'Monday',
                period: 1,
                existing: null,
                defaultClassNum: selectedClass,
              })
            }
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243d24] transition-colors"
          >
            + Add period
          </button>
        </div>
      )}

      {isStaff && classNums.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center space-y-3">
          <p className="text-sm text-gray-400">No timetable entries yet.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePrint}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
            >
              Print timetable
            </button>
            {isStaff && (
              <button
                onClick={() =>
                  setEditCell({
                    day: 'Monday',
                    period: 1,
                    existing: null,
                    defaultClassNum: null,
                  })
                }
                className="text-xs font-medium px-4 py-2 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243d24] transition-colors"
              >
                + Add first period
              </button>
            )}
          </div>
        </div>
      )}

      {!isStaff && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          No timetable has been set for your class yet.
        </div>
      )}

      {(isStaff ? selectedClass !== null && classNums.length > 0 : rows.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <div className="text-sm font-semibold text-gray-900">
              {selectedClass ? `Class ${selectedClass} Timetable` : 'Timetable'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table
              className="border-collapse w-full"
              style={{ minWidth: 640 }}
            >
              <thead>
                <tr className="border-b border-gray-100">
                  <th
                    className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide border-r border-gray-50"
                    style={{ width: 56 }}
                  >
                    #
                  </th>
                  {DAYS.map(d => (
                    <th
                      key={d}
                      className="px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide text-center"
                    >
                      {DAY_SHORT[d]}
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
                    <td className="px-3 py-2 text-xs font-medium text-gray-300 text-center border-r border-gray-50 align-middle">
                      {period}
                    </td>

                    {DAYS.map(day => {
                      const row = lookup[day]?.[period]
                      const sty = row ? subjectStyle(row.subject) : null
                      const tLabel = row?.teacher_id
                        ? (teacherMap[row.teacher_id] ?? 'staff')
                        : null

                      return (
                        <td
                          key={day}
                          className="px-2 py-2 align-top"
                          style={{ minWidth: 120 }}
                        >
                          {row ? (
                            <div
                              className="rounded-lg p-2.5"
                              style={{
                                background: sty!.bg,
                                border: `1px solid ${sty!.border}`,
                              }}
                            >
                              <div
                                className="text-xs font-semibold capitalize leading-snug"
                                style={{ color: sty!.text }}
                              >
                                {row.subject}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {row.start_time}–{row.end_time}
                              </div>
                              {tLabel && (
                                <div className="text-[10px] text-gray-400 capitalize mt-0.5">
                                  {tLabel}
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
                            <button
                              onClick={() => openCell(day, period)}
                              className="w-full rounded-lg flex items-center justify-center text-gray-300 hover:text-[#6fcf6f] hover:bg-[#6fcf6f]/5 transition-colors text-base font-light"
                              style={{ minHeight: 52 }}
                            >
                              +
                            </button>
                          ) : (
                            <div
                              className="flex items-center justify-center"
                              style={{ minHeight: 52 }}
                            >
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

      {editCell && (
        <>
          <div
            className="fixed inset-0 bg-black/25 z-40"
            onClick={() => setEditCell(null)}
          />
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