'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { computeSubjectFinalGrades, fmtSubject, type FlatMarkRow, type WeightRow } from '@/lib/gradeUtils'
import { letterGrade } from '@/lib/calculateGrade'
import { CURRENT_TERM, CURRENT_YEAR, TERM_START_DATE, TERM_END_DATE } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

type Student = {
  id: string
  name: string
  roll_no: string
  class_num: string | number
  stage: string
  is_active?: boolean | null
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

// ── PDF generation ────────────────────────────────────────────────────────────

async function generatePDF(student: Student) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const supabase = createClient()

  // Fetch all marks for the student (all exams) and grade weights for their class
  const [{ data: rawMarks, error: marksErr }, { data: weightRows, error: weightsErr }, { data: logs, error: logsErr }] =
    await Promise.all([
      supabase
        .from('marks')
        .select('student_id, subject, exam, percent')
        .eq('student_id', student.id),
      supabase
        .from('grade_weights')
        .select('id, class_num, subject, assignment_weight, exam_weight, final_weight, quiz_weight')
        .eq('class_num', Number(student.class_num))
        .eq('academic_year', CURRENT_YEAR),
      supabase
        .from('attendance_logs')
        .select('status')
        .eq('student_id', student.id)
        .gte('day', TERM_START_DATE)
        .lte('day', TERM_END_DATE),
    ])

  if (marksErr)  throw new Error(`Could not load marks: ${marksErr.message}`)
  if (weightsErr) throw new Error(`Could not load grade weights: ${weightsErr.message}`)
  if (logsErr)   throw new Error(`Could not load attendance: ${logsErr.message}`)

  const marks: FlatMarkRow[] = (rawMarks ?? []).map(m => ({
    student_id: student.id,
    subject:    m.subject,
    exam:       m.exam,
    percent:    m.percent,
  }))

  const weights: WeightRow[] = (weightRows ?? []).map(w => ({
    id:                 w.id,
    class_num:          w.class_num,
    subject:            w.subject,
    assignment_weight:  w.assignment_weight,
    exam_weight:        w.exam_weight,
    final_weight:       w.final_weight,
    quiz_weight:        w.quiz_weight,
  }))

  // Compute one final grade per subject
  const subjectGrades = computeSubjectFinalGrades(student.id, marks, weights)

  // Attendance
  const presentCount  = (logs ?? []).filter(l => l.status === 'present').length
  const absentCount   = (logs ?? []).filter(l => l.status === 'absent').length
  const totalDays     = presentCount + absentCount
  const attendancePct = totalDays > 0
    ? Math.round((presentCount / totalDays) * 100)
    : 0

  // Overall average across all subjects
  const overallPct = subjectGrades.length > 0
    ? Math.round(
        subjectGrades.reduce((s, g) => s + g.overall, 0) / subjectGrades.length
      )
    : null

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 20

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(26, 46, 26)
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setTextColor(111, 207, 111)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('UTHAAN SCHOOL', pageW / 2, 11, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('STUDENT REPORT CARD', pageW / 2, 18, { align: 'center' })
  doc.text(
    `${CURRENT_TERM}  ·  Academic Year ${CURRENT_YEAR}`,
    pageW / 2, 24, { align: 'center' }
  )
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })}`,
    pageW / 2, 30, { align: 'center' }
  )

  // ── Student info box ──────────────────────────────────────────────────────
  const boxY   = 44
  doc.setDrawColor(200, 200, 195)
  doc.setFillColor(248, 247, 244)
  doc.roundedRect(margin, boxY, pageW - margin * 2, 34, 2, 2, 'FD')

  const col1x   = margin + 6
  const col2x   = pageW / 2 + 6
  const lineH   = 8
  const labelW1 = 34
  const labelW2 = 22

  const leftFields: [string, string][] = [
    ['Student Name',  student.name],
    ['Class',         String(student.class_num)],
    ['Academic Year', CURRENT_YEAR],
  ]
  const rightFields: [string, string][] = [
    ['Roll No.', String(student.roll_no)],
    ['Stage',    String(student.stage ?? '—')],
  ]

  doc.setFontSize(9)
  leftFields.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 75)
    doc.text(`${label}:`, col1x, boxY + 9 + i * lineH)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, col1x + labelW1, boxY + 9 + i * lineH)
  })
  rightFields.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 75)
    doc.text(`${label}:`, col2x, boxY + 9 + i * lineH)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, col2x + labelW2, boxY + 9 + i * lineH)
  })

  // ── Academic Performance ──────────────────────────────────────────────────
  const marksY = boxY + 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 46, 26)
  doc.text('Academic Performance', margin, marksY)

  const tableRows = subjectGrades.map(g => [
    fmtSubject(g.subject),
    `${g.overall}%`,
    g.letter,
    g.overall >= 50 ? 'Pass' : 'Fail',
  ])

  autoTable(doc, {
    startY: marksY + 4,
    head: [['Subject', 'Final %', 'Grade', 'Pass / Fail']],
    body: tableRows.length > 0
      ? tableRows
      : [['No marks recorded for this term', '', '', '']],
    foot: overallPct !== null
      ? [['Overall Average', `${overallPct}%`, letterGrade(overallPct), '']]
      : undefined,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40] },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle:  'bold',
      halign:     'center',
    },
    footStyles: {
      fillColor: [235, 245, 235],
      textColor: [26, 46, 26],
      fontStyle:  'bold',
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw)
        data.cell.styles.textColor = val === 'Pass' ? [0, 120, 60] : [180, 0, 0]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    alternateRowStyles: { fillColor: [245, 244, 241] },
  })

  const afterMarksY = (doc as any).lastAutoTable.finalY + 10

  // ── Attendance Summary ────────────────────────────────────────────────────
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
    styles: { fontSize: 8.5, cellPadding: 3.5, halign: 'center', textColor: [40, 40, 40] },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle:  'bold',
      halign:     'center',
    },
    columnStyles: {
      3: {
        textColor: attendancePct >= 75 ? [0, 120, 60] : [180, 0, 0],
        fontStyle: 'bold',
      },
    },
  })

  // ── Signatures ────────────────────────────────────────────────────────────
  const sigY     = (doc as any).lastAutoTable.finalY + 22
  const sigLineW = 55

  if (sigY + 20 < pageH - 16) {
    doc.setDrawColor(160, 160, 155)
    doc.setLineWidth(0.3)
    doc.line(margin, sigY, margin + sigLineW, sigY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 95)
    doc.text('Class Teacher', margin, sigY + 5)

    const prinX = pageW - margin - sigLineW
    doc.line(prinX, sigY, prinX + sigLineW, sigY)
    doc.text('Principal', prinX, sigY + 5)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(26, 46, 26)
  doc.rect(0, pageH - 12, pageW, 12, 'F')
  doc.setTextColor(111, 207, 111)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.text(
    'Uthaan School Management System  ·  Confidential',
    pageW / 2,
    pageH - 4.5,
    { align: 'center' }
  )

  const safeName = student.name.replace(/\s+/g, '_')
  doc.save(`ReportCard_${safeName}_${student.roll_no}.pdf`)
}

// ── StudentReportCardView ─────────────────────────────────────────────────────

function StudentReportCardView({ student }: { student: Student }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await generatePDF(student)
      toast.success('Report card downloaded.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate report card.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Your Report Card</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Your results have been released by the school. Download your final report card below.
          </p>
        </div>
        <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{student.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Roll {student.roll_no} · Class {student.class_num} · {student.stage ?? '—'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{CURRENT_TERM}</div>
            <div className="text-xs text-gray-500 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 inline-block">
              Shows final subject grades computed across all exams
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="shrink-0 bg-[#1a2e1a] hover:bg-[#243824] active:scale-[0.98] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
          >
            {loading ? 'Generating PDF…' : 'Download Report Card'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ResultsPage ──────────────────────────────────────────────────────────

export default function ResultsPage({
  students,
  releases: initialReleases,
  role = 'teacher',
}: {
  students: Student[]
  releases: ReleaseRow[]
  role?: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading]               = useState<string | null>(null)
  const [releaseLoading, setReleaseLoading] = useState<number | null>(null)
  const [releases, setReleases]             = useState(initialReleases)
  const [classFilter, setClassFilter]       = useState<number | 'all'>('all')

  const activeStudents = useMemo(
    () => students.filter(s => s.is_active !== false),
    [students]
  )

  // ── Student / Parent view ─────────────────────────────────────────────────
  if (role === 'student' || role === 'parent') {
    if (activeStudents.length === 0) {
      return (
        <div className="text-center py-12 text-sm text-gray-400">
          No student record found.
        </div>
      )
    }
    return <StudentReportCardView student={activeStudents[0]} />
  }

  // ── Admin / Teacher view ──────────────────────────────────────────────────

  const classNums = useMemo(() => {
    const set = new Set<number>()
    activeStudents.forEach(s => {
      const n = Number(s.class_num)
      if (!isNaN(n)) set.add(n)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [activeStudents])

  const releaseMap = useMemo(() => {
    const map: Record<number, ReleaseRow> = {}
    releases.forEach(r => { map[r.class_num] = r })
    return map
  }, [releases])

  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') return activeStudents
    return activeStudents.filter(s => Number(s.class_num) === classFilter)
  }, [activeStudents, classFilter])

  async function handleGenerate(student: Student) {
    setLoading(student.id)
    try {
      await generatePDF(student)
      toast.success('Report card downloaded.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate report card.')
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
        .update({ released: !existing.released, released_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      setReleaseLoading(null)
      if (error) { toast.error(error.message); return }
      if (data) setReleases(prev => prev.map(r => r.id === data.id ? data : r))
      return
    }

    const { data, error } = await supabase
      .from('result_releases')
      .insert({
        academic_year: CURRENT_YEAR,
        term:          CURRENT_TERM,
        class_num:     classNum,
        released:      true,
      })
      .select()
      .single()

    setReleaseLoading(null)
    if (error) { toast.error(error.message); return }
    if (data) setReleases(prev => [...prev, data])
  }

  return (
    <div className="max-w-4xl space-y-5">

      {/* Release management */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Release Report Cards</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Release results by class so students and parents can download their final report card.
          </p>
        </div>

        {classNums.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No classes found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classNums.map(classNum => {
              const release    = releaseMap[classNum]
              const isReleased = release?.released === true
              return (
                <div key={classNum} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Class {classNum}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{CURRENT_TERM} · {CURRENT_YEAR}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                      isReleased
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      {isReleased ? 'Released' : 'Not released'}
                    </span>
                    <button
                      onClick={() => toggleRelease(classNum)}
                      disabled={releaseLoading === classNum}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243824] disabled:opacity-50 transition-colors min-h-[36px]"
                    >
                      {releaseLoading === classNum ? 'Saving…' : isReleased ? 'Unrelease' : 'Release'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Student list + download */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Download Report Cards</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate a PDF with each student&apos;s final subject grades.
            </p>
          </div>
          {/* Class filter */}
          {classNums.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setClassFilter('all')}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  classFilter === 'all'
                    ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                All
              </button>
              {classNums.map(n => (
                <button
                  key={n}
                  onClick={() => setClassFilter(n)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
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
        </div>

        {filteredStudents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No students found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredStudents.map(s => {
              const isReleased = releaseMap[Number(s.class_num)]?.released === true
              return (
                <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Roll {s.roll_no} · Class {s.class_num} · {s.stage ?? '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                      isReleased
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      {isReleased ? 'Visible to family' : 'Hidden'}
                    </span>
                    <button
                      onClick={() => handleGenerate(s)}
                      disabled={loading === s.id}
                      className="shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243824] disabled:opacity-50 transition-colors min-h-[36px]"
                    >
                      {loading === s.id ? 'Generating…' : 'Download PDF'}
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
