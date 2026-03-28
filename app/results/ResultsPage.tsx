'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Student = {
  id: string
  name: string
  roll_no: string
  class_num: string | number
  stage: string
}

type ReleaseRow = {
  id: string
  academic_year: string
  term: string
  class_num: number
  released: boolean
  released_at?: string
  released_by?: string | null
}

const CURRENT_TERM = 'Spring Term 2026'
const CURRENT_YEAR = '2025-2026'

function getGrade(percent: number): string {
  if (percent >= 90) return 'A'
  if (percent >= 80) return 'B'
  if (percent >= 70) return 'C'
  if (percent >= 60) return 'D'
  return 'F'
}

async function generatePDF(student: Student) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const supabase = createClient()

  const [{ data: marks }, { data: logs }] = await Promise.all([
    supabase
      .from('marks')
      .select('subject, exam, percent')
      .eq('student_id', student.id),
    supabase
      .from('attendance_logs')
      .select('status')
      .eq('student_id', student.id),
  ])

  const presentCount = (logs ?? []).filter(l => l.status === 'present').length
  const absentCount = (logs ?? []).filter(l => l.status === 'absent').length
  const totalDays = presentCount + absentCount
  const attendancePct =
    totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  doc.setFillColor(26, 46, 26)
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setTextColor(111, 207, 111)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('UTHAAN SCHOOL MANAGEMENT SYSTEM', pageW / 2, 13, {
    align: 'center',
  })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('STUDENT REPORT CARD', pageW / 2, 21, { align: 'center' })
  doc.text('Academic Year 2025–26', pageW / 2, 27, { align: 'center' })

  const boxY = 38
  doc.setDrawColor(200, 200, 195)
  doc.setFillColor(248, 247, 244)
  doc.roundedRect(margin, boxY, pageW - margin * 2, 32, 2, 2, 'FD')

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')

  const col1x = margin + 5
  const col2x = pageW / 2 + 5
  const lineH = 7

  doc.text('Student Name:', col1x, boxY + 9)
  doc.setFont('helvetica', 'normal')
  doc.text(student.name, col1x + 32, boxY + 9)

  doc.setFont('helvetica', 'bold')
  doc.text('Roll No:', col2x, boxY + 9)
  doc.setFont('helvetica', 'normal')
  doc.text(String(student.roll_no), col2x + 18, boxY + 9)

  doc.setFont('helvetica', 'bold')
  doc.text('Class:', col1x, boxY + 9 + lineH)
  doc.setFont('helvetica', 'normal')
  doc.text(String(student.class_num), col1x + 32, boxY + 9 + lineH)

  doc.setFont('helvetica', 'bold')
  doc.text('Stage:', col2x, boxY + 9 + lineH)
  doc.setFont('helvetica', 'normal')
  doc.text(String(student.stage ?? '—'), col2x + 18, boxY + 9 + lineH)

  doc.setFont('helvetica', 'bold')
  doc.text('Academic Year:', col1x, boxY + 9 + lineH * 2)
  doc.setFont('helvetica', 'normal')
  doc.text('2025–26', col1x + 32, boxY + 9 + lineH * 2)

  const marksY = boxY + 38

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 46, 26)
  doc.text('Academic Performance', margin, marksY)

  const marksRows = (marks ?? []).map(m => {
    const pct = Math.round(m.percent ?? 0)
    return [
      m.subject ?? '—',
      m.exam ?? '—',
      `${pct}%`,
      getGrade(pct),
      pct >= 60 ? 'Pass' : 'Fail',
    ]
  })

  autoTable(doc, {
    startY: marksY + 4,
    head: [['Subject', 'Exam', 'Marks Obtained', 'Grade', 'Pass / Fail']],
    body: marksRows.length > 0 ? marksRows : [['No marks recorded', '', '', '', '']],
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw)
        data.cell.styles.textColor = val === 'Pass' ? [0, 120, 60] : [180, 0, 0]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    alternateRowStyles: { fillColor: [245, 244, 241] },
  })

  const afterMarksY = (doc as any).lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 46, 26)
  doc.text('Attendance Summary', margin, afterMarksY)

  autoTable(doc, {
    startY: afterMarksY + 4,
    head: [['Total School Days', 'Days Present', 'Days Absent', 'Attendance %']],
    body: [[
      String(totalDays),
      String(presentCount),
      String(absentCount),
      `${attendancePct}%`,
    ]],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      halign: 'center',
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      3: {
        textColor: attendancePct >= 75 ? [0, 120, 60] : [180, 0, 0],
        fontStyle: 'bold',
      },
    },
  })

  const sigY = (doc as any).lastAutoTable.finalY + 18
  const sigLineW = 55

  doc.setDrawColor(160, 160, 155)
  doc.setLineWidth(0.3)

  doc.line(margin, sigY, margin + sigLineW, sigY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 95)
  doc.text('Class Teacher Signature', margin, sigY + 5)

  const prinX = pageW - margin - sigLineW
  doc.line(prinX, sigY, prinX + sigLineW, sigY)
  doc.text('Principal Signature', prinX, sigY + 5)

  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(26, 46, 26)
  doc.rect(0, pageH - 14, pageW, 14, 'F')
  doc.setTextColor(111, 207, 111)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'Generated by Uthaan — The future of Pakistani education',
    pageW / 2,
    pageH - 5.5,
    { align: 'center' }
  )

  const safeName = student.name.replace(/\s+/g, '_')
  doc.save(`ReportCard_${safeName}_${student.roll_no}.pdf`)
}

export default function ResultsPage({
  students,
  releases: initialReleases,
}: {
  students: Student[]
  releases: ReleaseRow[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState<string | null>(null)
  const [releaseLoading, setReleaseLoading] = useState<number | null>(null)
  const [releases, setReleases] = useState(initialReleases)

  const classNums = useMemo(() => {
    const set = new Set<number>()
    students.forEach(s => {
      const num = Number(s.class_num)
      if (!Number.isNaN(num)) set.add(num)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [students])

  const releaseMap = useMemo(() => {
    const map: Record<number, ReleaseRow> = {}
    releases.forEach(r => {
      map[r.class_num] = r
    })
    return map
  }, [releases])

  async function handleGenerate(student: Student) {
    setLoading(student.id)
    try {
      await generatePDF(student)
    } finally {
      setLoading(null)
    }
  }

  async function toggleRelease(classNum: number) {
    setReleaseLoading(classNum)
    const existing = releaseMap[classNum]

    if (existing) {
      const { data, error } = await supabase
        .from('result_releases')
        .update({
          released: !existing.released,
          released_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      setReleaseLoading(null)

      if (error) {
        alert(error.message)
        return
      }

      if (data) {
        setReleases(prev => prev.map(r => (r.id === data.id ? data : r)))
      }
      return
    }

    const { data, error } = await supabase
      .from('result_releases')
      .insert({
        academic_year: CURRENT_YEAR,
        term: CURRENT_TERM,
        class_num: classNum,
        released: true,
      })
      .select()
      .single()

    setReleaseLoading(null)

    if (error) {
      alert(error.message)
      return
    }

    if (data) {
      setReleases(prev => [...prev, data])
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Release Report Cards</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Release results by class so students and parents can view and print their report cards.
          </p>
        </div>

        {classNums.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No classes found
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classNums.map(classNum => {
              const release = releaseMap[classNum]
              const isReleased = release?.released === true

              return (
                <div
                  key={classNum}
                  className="px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Class {classNum}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {CURRENT_TERM} · {CURRENT_YEAR}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full border ${
                        isReleased
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}
                    >
                      {isReleased ? 'Released' : 'Not released'}
                    </span>

                    <button
                      onClick={() => toggleRelease(classNum)}
                      disabled={releaseLoading === classNum}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243824] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {releaseLoading === classNum
                        ? 'Saving…'
                        : isReleased
                        ? 'Unrelease'
                        : 'Release'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">All Students</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Generate and download a PDF report card for any student.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No students found
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map(s => {
              const isReleased = releaseMap[Number(s.class_num)]?.released === true

              return (
                <div
                  key={s.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Roll {s.roll_no} · Class {s.class_num} · {s.stage ?? '—'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                        isReleased
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}
                    >
                      {isReleased ? 'Visible to family' : 'Hidden from family'}
                    </span>

                    <button
                      onClick={() => handleGenerate(s)}
                      disabled={loading === s.id}
                      className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243824] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading === s.id ? 'Generating…' : 'Generate Report Card'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}