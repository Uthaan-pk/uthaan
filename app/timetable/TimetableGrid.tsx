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

function formatTime(time: string) {
  if (!time) return ''

  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time

  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12

  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
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

  const mobileDays = useMemo(
    () =>
      DAYS.map(day => ({
        day,
        rows: PERIODS.map(period => ({
          period,
          row: lookup[day]?.[period] ?? null,
        })).filter(entry => entry.row),
      })).filter(section => section.rows.length > 0),
    [lookup]
  )

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

  function getInstructorLabel(row: TimetableRow | null | undefined) {
    if (!row) return null
    if (row.instructor_name?.trim()) return row.instructor_name.trim()
    if (row.teacher_id) return teacherMap[row.teacher_id] ?? 'Assigned Staff'
    return 'Unassigned'
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

        const instructor = getInstructorLabel(row)

        return `
          <td>
            <div class="entry">
              <div class="subject">${row.subject}</div>
              <div class="time">${formatTime(row.start_time)} – ${formatTime(row.end_time)}</div>
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
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #eef7ef;
              color: #1f2937;
            }

            body {
              position: relative;
              overflow: hidden;
            }

            .page-bg {
              position: fixed;
              inset: 0;
              z-index: 0;
              background:
                radial-gradient(circle at top left, rgba(111, 207, 111, 0.18), transparent 28%),
                radial-gradient(circle at top right, rgba(26, 46, 26, 0.10), transparent 24%),
                radial-gradient(circle at bottom left, rgba(111, 207, 111, 0.14), transparent 24%),
                linear-gradient(135deg, #f6fbf6 0%, #edf7ee 45%, #f9fcf9 100%);
            }

            .bg-shape-1,
            .bg-shape-2,
            .bg-shape-3 {
              position: fixed;
              border-radius: 9999px;
              z-index: 0;
              pointer-events: none;
            }

            .bg-shape-1 {
              width: 260px;
              height: 260px;
              top: -80px;
              right: -70px;
              background: rgba(111, 207, 111, 0.12);
            }

            .bg-shape-2 {
              width: 220px;
              height: 220px;
              bottom: -80px;
              left: -60px;
              background: rgba(26, 46, 26, 0.08);
            }

            .bg-shape-3 {
              width: 140px;
              height: 140px;
              bottom: 40px;
              right: 80px;
              background: rgba(111, 207, 111, 0.10);
            }

            .page {
              position: relative;
              z-index: 1;
              padding: 8px;
            }

            .shell {
              background: rgba(255, 255, 255, 0.96);
              border: 1px solid rgba(209, 213, 219, 0.9);
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 12px 30px rgba(23, 48, 26, 0.08);
            }

            .topbar {
              position: relative;
              background: linear-gradient(135deg, #17301a 0%, #234828 100%);
              color: #ffffff;
              padding: 20px 24px 18px;
              text-align: center;
              overflow: hidden;
            }

            .topbar::before {
              content: '';
              position: absolute;
              width: 220px;
              height: 220px;
              top: -120px;
              left: -70px;
              border-radius: 9999px;
              background: rgba(126, 224, 129, 0.10);
            }

            .topbar::after {
              content: '';
              position: absolute;
              width: 260px;
              height: 260px;
              bottom: -160px;
              right: -90px;
              border-radius: 9999px;
              background: rgba(255, 255, 255, 0.06);
            }

            .school {
              position: relative;
              z-index: 1;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: 0.8px;
              color: #7ee081;
              margin-bottom: 6px;
            }

            .title {
              position: relative;
              z-index: 1;
              font-size: 11px;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #f3f4f6;
            }

            .meta-box {
              background: linear-gradient(180deg, #f8faf8 0%, #f4f7f4 100%);
              border-bottom: 1px solid #e5e7eb;
              padding: 14px 18px;
            }

            .meta-grid {
              width: 100%;
              border-collapse: collapse;
            }

            .meta-grid td {
              padding: 4px 0;
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
              padding: 14px 14px 10px;
            }

            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              table-layout: fixed;
              overflow: hidden;
              border: 1px solid #d1d5db;
              border-radius: 12px;
              background: #ffffff;
            }

            thead th {
              background: linear-gradient(180deg, #17301a 0%, #214525 100%);
              color: #7ee081;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              padding: 11px 8px;
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
              height: 88px;
              text-align: center;
              vertical-align: middle;
              background: rgba(255, 255, 255, 0.94);
            }

            tbody tr td:last-child {
              border-right: 0;
            }

            .period {
              width: 52px;
              font-weight: 700;
              font-size: 12px;
              color: #1f2937;
              background: linear-gradient(180deg, #f3f4f6 0%, #eceff1 100%);
            }

            .entry {
              min-height: 66px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 4px;
              padding: 8px 6px;
              border-radius: 10px;
              background: linear-gradient(
                180deg,
                rgba(111, 207, 111, 0.08) 0%,
                rgba(111, 207, 111, 0.03) 100%
              );
              border: 1px solid rgba(111, 207, 111, 0.20);
            }

            .subject {
              font-size: 13px;
              font-weight: 700;
              color: #17301a;
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
            }

            .empty-cell {
              background: rgba(250, 250, 250, 0.85);
            }

            .empty {
              color: #c0c4cc;
              font-size: 14px;
              font-weight: 500;
            }

            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0 16px 12px;
            }

            .note {
              font-size: 9px;
              color: #6b7280;
            }

            .footer {
              background: linear-gradient(135deg, #17301a 0%, #234828 100%);
              color: #7ee081;
              text-align: center;
              padding: 9px 10px;
              font-size: 9px;
              font-style: italic;
            }
          </style>
        </head>

        <body>
          <div class="page-bg"></div>
          <div class="bg-shape-1"></div>
          <div class="bg-shape-2"></div>
          <div class="bg-shape-3"></div>

          <div class="page">
            <div class="shell">
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

              <div class="footer-row">
                <div class="note">For official school use</div>
                <div class="note">Printed from Uthaan timetable module</div>
              </div>

              <div class="footer">
                Generated by Uthaan — The future of Pakistani education
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus()
                window.print()
              }, 250)
            }

            window.onafterprint = function () {
              window.close()
            }
          </script>
        </body>
      </html>
    `
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=1280,height=900')
    if (!printWindow) return

    const html = buildPrintHtml()
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div>
      {isStaff && classNums.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {classNums.map(cn => (
            <button
              key={cn}
              onClick={() => setSelectedClass(cn)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedClass === cn
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Class {cn}
            </button>
          ))}

          <button
            onClick={handlePrint}
            className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800"
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
            className="rounded-lg bg-[#1a2e1a] px-3 py-1.5 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24]"
          >
            + Add period
          </button>
        </div>
      )}

      {isStaff && classNums.length === 0 && (
        <div className="space-y-3 rounded-xl border border-gray-100 bg-white px-5 py-12 text-center">
          <p className="text-sm text-gray-400">No timetable entries yet.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePrint}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300"
            >
              Print timetable
            </button>
            <button
              onClick={() =>
                setEditCell({
                  day: 'Monday',
                  period: 1,
                  existing: null,
                  defaultClassNum: null,
                })
              }
              className="rounded-lg bg-[#1a2e1a] px-4 py-2 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24]"
            >
              + Add first period
            </button>
          </div>
        </div>
      )}

      {!isStaff && rows.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400">
          No timetable has been set for your class yet.
        </div>
      )}

      {(isStaff
        ? selectedClass !== null && classNums.length > 0
        : rows.length > 0) && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-50 bg-gradient-to-r from-white to-[#f8fbf8] px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">
              {selectedClass ? `Class ${selectedClass} Timetable` : 'Timetable'}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Weekly class schedule with subject, time, and instructor
            </div>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {mobileDays.length > 0 ? (
              mobileDays.map(section => (
                <div
                  key={section.day}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-[#fafcf9]"
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {section.day}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {section.rows.map(({ period, row }) => {
                      if (!row) return null
                      const sty = subjectStyle(row.subject)
                      const instructorLabel = getInstructorLabel(row)

                      return (
                        <div key={`${section.day}-${period}`} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                Period {period}
                              </div>
                              <div
                                className="mt-1 text-sm font-semibold leading-tight"
                                style={{ color: sty.text }}
                              >
                                {row.subject}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {formatTime(row.start_time)} - {formatTime(row.end_time)}
                              </div>
                              {instructorLabel && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {instructorLabel}
                                </div>
                              )}
                            </div>

                            {isStaff && (
                              <button
                                onClick={() => openCell(section.day, period)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-[#fafcf9] px-4 py-8 text-center text-sm text-gray-500">
                No timetable periods have been set for this class yet.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table
              className="w-full border-collapse"
              style={{ minWidth: 700 }}
            >
              <thead>
                <tr className="border-b border-gray-100">
                  <th
                    className="border-r border-gray-50 px-3 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400"
                    style={{ width: 56 }}
                  >
                    #
                  </th>
                  {DAYS.map(d => (
                    <th
                      key={d}
                      className="px-3 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400"
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
                    className={
                      pi < PERIODS.length - 1 ? 'border-b border-gray-50' : ''
                    }
                  >
                    <td className="border-r border-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-300 align-middle">
                      {period}
                    </td>

                    {DAYS.map(day => {
                      const row = lookup[day]?.[period]
                      const sty = row ? subjectStyle(row.subject) : null
                      const instructorLabel = getInstructorLabel(row)

                      return (
                        <td
                          key={day}
                          className="px-2 py-2 align-top"
                          style={{ minWidth: 128 }}
                        >
                          {row ? (
                            <div
                              className="rounded-xl p-3 shadow-sm"
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

                              <div className="mt-1 text-[10px] text-gray-500">
                                {formatTime(row.start_time)} –{' '}
                                {formatTime(row.end_time)}
                              </div>

                              {instructorLabel && (
                                <div className="mt-1 text-[10px] text-gray-500">
                                  {instructorLabel}
                                </div>
                              )}

                              {isStaff && (
                                <button
                                  onClick={() => openCell(day, period)}
                                  className="mt-2 text-[10px] text-gray-400 underline transition-colors hover:text-gray-700"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          ) : isStaff ? (
                            <button
                              onClick={() => openCell(day, period)}
                              className="flex w-full items-center justify-center rounded-xl border border-dashed border-gray-200 text-base font-light text-gray-300 transition-colors hover:bg-[#6fcf6f]/5 hover:text-[#6fcf6f]"
                              style={{ minHeight: 66 }}
                            >
                              +
                            </button>
                          ) : (
                            <div
                              className="flex items-center justify-center rounded-xl bg-[#fafafa]"
                              style={{ minHeight: 66 }}
                            >
                              <span className="text-xs text-gray-200">—</span>
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
            className="fixed inset-0 z-40 bg-black/25"
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
