'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReportCommentGenerator from '@/components/ReportCommentGenerator'
import toast from 'react-hot-toast'
import {
  computeSubjectFinalGrades,
  fmtSubject,
  type FlatMarkRow,
  type WeightRow,
} from '@/lib/gradeUtils'
import { letterGrade } from '@/lib/calculateGrade'
import {
  CURRENT_TERM,
  CURRENT_YEAR,
  TERM_START_DATE,
  TERM_END_DATE,
} from '@/lib/constants'

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

type ReportCardData = {
  subjectGrades: ReturnType<typeof computeSubjectFinalGrades>
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  earlyLeaveCount: number
  attendanceDenominator: number
  totalDays: number
  attendancePct: number
  overallPct: number | null
}

async function loadReportCardData(student: Student): Promise<ReportCardData> {
  const supabase = createClient()

  const [
    { data: rawMarks, error: marksErr },
    { data: weightRows, error: weightsErr },
    { data: logs, error: logsErr },
    { data: catWeightRows },
  ] = await Promise.all([
    supabase
      .from('marks')
      .select('student_id, subject, exam, percent')
      .eq('student_id', student.id),

    supabase
      .from('grade_weights')
      .select(
        'id, class_num, subject, assignment_weight, exam_weight, final_weight, quiz_weight'
      )
      .eq('class_num', Number(student.class_num))
      .eq('academic_year', CURRENT_YEAR),

    supabase
      .from('attendance_logs')
      .select('status')
      .eq('student_id', student.id)
      .gte('day', TERM_START_DATE)
      .lte('day', TERM_END_DATE),

    supabase
      .from('grade_category_weights')
      .select('class_num, category, weight')
      .or(`class_num.eq.${Number(student.class_num)},class_num.is.null`)
  ])

  if (marksErr) throw new Error(`Could not load marks: ${marksErr.message}`)
  if (weightsErr) {
    throw new Error(`Could not load grade weights: ${weightsErr.message}`)
  }
  if (logsErr) throw new Error(`Could not load attendance: ${logsErr.message}`)

  const marks: FlatMarkRow[] = (rawMarks ?? []).map((m: any) => ({
    student_id: student.id,
    subject: m.subject,
    exam: m.exam,
    percent: m.percent,
  }))

  const weights: WeightRow[] = (weightRows ?? []).map((w: any) => ({
    id: w.id,
    class_num: w.class_num,
    subject: w.subject,
    assignment_weight: w.assignment_weight,
    exam_weight: w.exam_weight,
    final_weight: w.final_weight,
    quiz_weight: w.quiz_weight,
  }))

  // Build fallback weights from category weights (class-specific > school-wide)
  // Only used for subjects that have no subject-specific weights
  let fallbackWeightRow: WeightRow | null = null
  if ((catWeightRows ?? []).length > 0) {
    // Prefer class-specific over school-wide (null class_num)
    const classCats = (catWeightRows ?? []).filter(
      (r: any) => r.class_num === Number(student.class_num)
    )
    const useCats = classCats.length > 0 ? classCats : (catWeightRows ?? []).filter((r: any) => r.class_num == null)

    if (useCats.length > 0) {
      const catMap: Record<string, number> = {}
      for (const r of useCats as any[]) catMap[r.category] = r.weight

      fallbackWeightRow = {
        id: 'fallback',
        class_num: Number(student.class_num),
        subject: '__fallback__',
        assignment_weight: catMap['assignment'] ?? 25,
        exam_weight: catMap['midterm'] ?? 25,
        final_weight: catMap['final'] ?? 25,
        quiz_weight: catMap['quiz'] ?? 25,
      }
    }
  }

  // Get all unique subjects in the marks, inject fallback weight row for any
  // subject that doesn't already have a specific weight configured
  const subjectsWithWeights = new Set(weights.map((w) => w.subject.toLowerCase()))
  const allSubjectsInMarks = Array.from(
    new Set(marks.map((m) => m.subject.toLowerCase()))
  )
  const fallbackWeights: WeightRow[] = []
  if (fallbackWeightRow) {
    for (const sub of allSubjectsInMarks) {
      if (!subjectsWithWeights.has(sub)) {
        fallbackWeights.push({ ...fallbackWeightRow, subject: sub })
      }
    }
  }

  const subjectGrades = computeSubjectFinalGrades(student.id, marks, [
    ...weights,
    ...fallbackWeights,
  ])

  const presentCount = (logs ?? []).filter((l: any) => l.status === 'present').length
  const absentCount = (logs ?? []).filter((l: any) => l.status === 'absent').length
  const lateCount = (logs ?? []).filter((l: any) => l.status === 'late').length
  const excusedCount = (logs ?? []).filter((l: any) => l.status === 'excused').length
  const earlyLeaveCount = (logs ?? []).filter((l: any) => l.status === 'early_leave').length

  const totalDays =
    presentCount + absentCount + lateCount + excusedCount + earlyLeaveCount
  const attendanceDenominator = presentCount + absentCount + lateCount + earlyLeaveCount
  const attendancePct =
    attendanceDenominator > 0
      ? Math.round(
          ((presentCount + lateCount + earlyLeaveCount) / attendanceDenominator) *
            100
        )
      : 0

  const overallPct =
    subjectGrades.length > 0
      ? Math.round(
          subjectGrades.reduce((sum, g) => sum + g.overall, 0) /
            subjectGrades.length
        )
      : null

  return {
    subjectGrades,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    earlyLeaveCount,
    attendanceDenominator,
    totalDays,
    attendancePct,
    overallPct,
  }
}

async function generatePDF(student: Student) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const report = await loadReportCardData(student)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20

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
  doc.text(`${CURRENT_TERM}  ·  Academic Year ${CURRENT_YEAR}`, pageW / 2, 24, {
    align: 'center',
  })
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    pageW / 2,
    30,
    { align: 'center' }
  )

  const boxY = 44
  doc.setDrawColor(200, 200, 195)
  doc.setFillColor(248, 247, 244)
  doc.roundedRect(margin, boxY, pageW - margin * 2, 34, 2, 2, 'FD')

  const col1x = margin + 6
  const col2x = pageW / 2 + 6
  const lineH = 8
  const labelW1 = 34
  const labelW2 = 22

  const leftFields: [string, string][] = [
    ['Student Name', student.name],
    ['Class', String(student.class_num)],
    ['Academic Year', CURRENT_YEAR],
  ]
  const rightFields: [string, string][] = [
    ['Roll No.', String(student.roll_no)],
    ['Stage', String(student.stage ?? '—')],
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

  const marksY = boxY + 40
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 46, 26)
  doc.text('Academic Performance', margin, marksY)

  const tableRows = report.subjectGrades.map(g => [
    fmtSubject(g.subject),
    `${g.overall}%`,
    g.letter,
    g.overall >= 50 ? 'Pass' : 'Fail',
  ])

  autoTable(doc, {
    startY: marksY + 4,
    head: [['Subject', 'Final %', 'Grade', 'Pass / Fail']],
    body:
      tableRows.length > 0
        ? tableRows
        : [['No marks recorded for this term', '', '', '']],
    foot:
      report.overallPct !== null
        ? [['Overall Average', `${report.overallPct}%`, letterGrade(report.overallPct), '']]
        : undefined,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40] },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [235, 245, 235],
      textColor: [26, 46, 26],
      fontStyle: 'bold',
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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(26, 46, 26)
  doc.text('Attendance Summary', margin, afterMarksY)

  autoTable(doc, {
    startY: afterMarksY + 4,
    head: [[
      'Total Days',
      'Present',
      'Late',
      'Early Leave',
      'Absent',
      'Excused',
      'Attendance %',
    ]],
    body: [[
      String(report.totalDays),
      String(report.presentCount),
      String(report.lateCount),
      String(report.earlyLeaveCount),
      String(report.absentCount),
      String(report.excusedCount),
      `${report.attendancePct}%`,
    ]],
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      halign: 'center',
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: [26, 46, 26],
      textColor: [111, 207, 111],
      fontStyle: 'bold',
      halign: 'center',
    },
  })

  const sigY = (doc as any).lastAutoTable.finalY + 22
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

function ReportCardPreview({ student }: { student: Student }) {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportCardData | null>(null)

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        setLoading(true)
        setError(null)
        const data = await loadReportCardData(student)
        if (mounted) setReport(data)
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load report card.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [student])

  async function handleDownload() {
    setDownloading(true)
    try {
      await generatePDF(student)
      toast.success('Report card downloaded.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate report card.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          Loading report card…
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-red-100 px-5 py-12 text-center text-sm text-red-600">
          {error ?? 'Failed to load report card.'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#1a2e1a] px-5 py-5">
          <div className="text-center">
            <div className="text-sm font-bold text-[#6fcf6f]">UTHAAN SCHOOL</div>
            <div className="text-xs text-white mt-1">STUDENT REPORT CARD</div>
            <div className="text-[11px] text-white/80 mt-1">
              {CURRENT_TERM} · Academic Year {CURRENT_YEAR}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 border-b border-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-1">Student Name</div>
              <div className="font-medium text-gray-900">{student.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Roll No.</div>
              <div className="font-medium text-gray-900">{student.roll_no}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Class</div>
              <div className="font-medium text-gray-900">{student.class_num}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Stage</div>
              <div className="font-medium text-gray-900">{student.stage ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            Academic Performance
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Final subject grades computed across recorded marks and class weights.
          </p>
        </div>

        <div className="border-b border-gray-50">
          <div className="sm:hidden px-5 py-4 space-y-3">
            {report.subjectGrades.length > 0 ? (
              <>
                {report.subjectGrades.map((g) => (
                  <div
                    key={g.subject}
                    className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {fmtSubject(g.subject)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Final score {g.overall}%
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-800">
                        {g.letter}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        Result
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          g.overall >= 50
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {g.overall >= 50 ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                  </div>
                ))}
                {report.overallPct !== null && (
                  <div className="rounded-xl border border-green-100 bg-green-50/60 px-4 py-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[#1a2e1a]/70">
                      Overall Average
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-[#1a2e1a]">
                        {report.overallPct}%
                      </div>
                      <div className="text-sm font-semibold text-[#1a2e1a]">
                        {letterGrade(report.overallPct)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-8 text-center text-sm text-gray-500">
                No marks recorded for this term.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Subject
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Final %
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Grade
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {report.subjectGrades.length > 0 ? (
                report.subjectGrades.map((g, i) => (
                  <tr
                    key={g.subject}
                    className={i < report.subjectGrades.length - 1 ? 'border-b border-gray-50' : ''}
                  >
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {fmtSubject(g.subject)}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-700">
                      {g.overall}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-800">
                        {g.letter}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          g.overall >= 50
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {g.overall >= 50 ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-400"
                  >
                    No marks recorded for this term.
                  </td>
                </tr>
              )}
            </tbody>
            {report.overallPct !== null && (
              <tfoot>
                <tr className="border-t border-gray-100 bg-green-50/40">
                  <td className="px-5 py-3 font-semibold text-[#1a2e1a]">
                    Overall Average
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-[#1a2e1a]">
                    {report.overallPct}%
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-[#1a2e1a]">
                    {letterGrade(report.overallPct)}
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            )}
            </table>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="shrink-0 bg-[#1a2e1a] hover:bg-[#243824] active:scale-[0.98] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
            >
              {downloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Attendance Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
            <StatCard label="Total Days" value={report.totalDays} />
            <StatCard label="Present" value={report.presentCount} />
            <StatCard label="Late" value={report.lateCount} />
            <StatCard label="Early Leave" value={report.earlyLeaveCount} />
            <StatCard label="Absent" value={report.absentCount} />
            <StatCard label="Excused" value={report.excusedCount} />
            <StatCard label="Attendance %" value={`${report.attendancePct}%`} />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Attendance % excludes excused days from the denominator.
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  )
}

type BulkCommentEntry = {
  report: ReportCardData | null
  comment: string
  error: string | null
}

type AiReportCommentsState = {
  enabled: boolean
  monthlyLimit: number | null
  usedThisMonth: number
  quotaReached: boolean
}

export default function ResultsPage({
  students,
  releases: initialReleases,
  role = 'teacher',
  aiReportCommentsState = {
    enabled: false,
    monthlyLimit: null,
    usedThisMonth: 0,
    quotaReached: false,
  },
}: {
  students: Student[]
  releases: ReleaseRow[]
  role?: string
  aiReportCommentsState?: AiReportCommentsState
}) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState<string | null>(null)
  const [releaseLoading, setReleaseLoading] = useState<number | null>(null)
  const [releases, setReleases] = useState(initialReleases)
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false)
  const [bulkCommentError, setBulkCommentError] = useState<string | null>(null)
  const [bulkComments, setBulkComments] = useState<Record<string, BulkCommentEntry>>({})

  const activeStudents = useMemo(
    () => students.filter(s => s.is_active !== false),
    [students]
  )

  if (role === 'student' || role === 'parent') {
    if (activeStudents.length === 0) {
      return (
        <div className="text-center py-12 text-sm text-gray-400">
          No student record found.
        </div>
      )
    }

    return <ReportCardPreview student={activeStudents[0]} />
  }

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
    releases.forEach(r => {
      map[r.class_num] = r
    })
    return map
  }, [releases])

  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') return activeStudents
    return activeStudents.filter(s => Number(s.class_num) === classFilter)
  }, [activeStudents, classFilter])

  const reviewStudents = useMemo(() => {
    if (classFilter !== 'all') {
      return activeStudents.filter(s => Number(s.class_num) === classFilter)
    }

    if (classNums.length === 1) return activeStudents

    return []
  }, [activeStudents, classFilter, classNums])

  const aiRequiresClassSelection = classFilter === 'all' && classNums.length > 1
  const canUseAiReportComments = aiReportCommentsState.enabled
  const canGenerateBulkComments =
    canUseAiReportComments &&
    !aiReportCommentsState.quotaReached &&
    !aiRequiresClassSelection &&
    reviewStudents.length > 0

  const bulkAiStatusMessage = !canUseAiReportComments
    ? 'AI report comments are disabled for this school.'
    : aiReportCommentsState.quotaReached
      ? aiReportCommentsState.monthlyLimit === null
        ? 'AI report comments are temporarily unavailable.'
        : `Monthly AI comment limit reached (${aiReportCommentsState.usedThisMonth}/${aiReportCommentsState.monthlyLimit}).`
      : aiRequiresClassSelection
        ? 'Select one class to generate comments in bulk.'
        : null

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
        .update({
          released: !existing.released,
          released_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      setReleaseLoading(null)
      if (error) {
        toast.error(error.message)
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
      toast.error(error.message)
      return
    }
    if (data) {
      setReleases(prev => [...prev, data])
    }
  }

  async function handleBulkGenerate() {
    setBulkCommentError(null)
    setBulkComments({})

    if (!canUseAiReportComments) {
      setBulkCommentError('AI report comments are disabled for this school.')
      return
    }

    if (aiReportCommentsState.quotaReached) {
      setBulkCommentError(
        aiReportCommentsState.monthlyLimit === null
          ? 'AI report comments are temporarily unavailable.'
          : `Monthly AI comment limit reached (${aiReportCommentsState.usedThisMonth}/${aiReportCommentsState.monthlyLimit}).`
      )
      return
    }

    if (aiRequiresClassSelection) {
      setBulkCommentError('Select a class first to generate comments in bulk.')
      return
    }

    if (reviewStudents.length === 0) {
      setBulkCommentError('No students found for the current class.')
      return
    }

    setBulkGenerating(true)

    try {
      const reports = await Promise.all(reviewStudents.map((student) => loadReportCardData(student)))

      const response = await fetch('/api/ai/report-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: reviewStudents[0]?.class_num ?? classFilter,
          students: reviewStudents.map((student, index) => ({
            studentId: student.id,
            studentName: student.name,
            subjectGrades: reports[index].subjectGrades,
            attendancePct: reports[index].attendancePct,
            presentCount: reports[index].presentCount,
            absentCount: reports[index].absentCount,
            totalDays: reports[index].totalDays,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? data?.message ?? 'Failed to generate comments.')
      }

      const commentMap = new Map<string, string>()
      for (const item of data?.comments ?? []) {
        if (item?.studentId) commentMap.set(item.studentId, item.comment ?? '')
      }

      const nextEntries: Record<string, BulkCommentEntry> = {}
      reviewStudents.forEach((student, index) => {
        nextEntries[student.id] = {
          report: reports[index],
          comment: commentMap.get(student.id) ?? '',
          error: commentMap.get(student.id) ? null : 'No comment returned.',
        }
      })

      setBulkReviewOpen(true)
      setBulkComments(nextEntries)
      toast.success(`Generated comments for Class ${reviewStudents[0]?.class_num}.`)
    } catch (err: any) {
      setBulkComments({})
      setBulkCommentError(err?.message ?? 'Failed to generate comments.')
    } finally {
      setBulkGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            Release Report Cards
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Release results by class so students and parents can view and download
            their final report card.
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
                  className="px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Class {classNum}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {CURRENT_TERM} · {CURRENT_YEAR}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                      className="text-xs font-medium px-3.5 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f] hover:bg-[#243824] disabled:opacity-50 transition-colors min-h-[36px]"
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
        <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Download Report Cards
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate a PDF with each student&apos;s final subject grades.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || !canGenerateBulkComments}
              className="shrink-0 bg-[#1a2e1a] hover:bg-[#243824] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {bulkGenerating ? 'Generating comments...' : 'Generate comments for class'}
            </button>

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

            {bulkAiStatusMessage && (
              <div
                className={`max-w-xs text-xs ${
                  canUseAiReportComments ? 'text-gray-500' : 'text-amber-700'
                }`}
              >
                {bulkAiStatusMessage}
              </div>
            )}

            {canUseAiReportComments &&
              !aiReportCommentsState.quotaReached &&
              aiReportCommentsState.monthlyLimit !== null && (
                <div className="text-xs text-gray-500">
                  Usage this month: {aiReportCommentsState.usedThisMonth}/
                  {aiReportCommentsState.monthlyLimit}
                </div>
              )}
          </div>
        </div>

        {canUseAiReportComments && bulkReviewOpen && (
          <div className="border-b border-gray-50 bg-[#fafcf9] px-5 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Comment Review
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review, edit, regenerate, copy, or print comments for the selected class.
                </p>
              </div>
              <button
                onClick={() => setBulkReviewOpen(false)}
                className="text-xs font-medium px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300 transition-colors min-h-[36px]"
              >
                Hide review
              </button>
            </div>

            {bulkCommentError && (
              <div className="mt-3 text-xs text-red-600">{bulkCommentError}</div>
            )}

            {bulkGenerating && (
              <div className="mt-3 text-xs text-gray-500">
                Generating comments for {reviewStudents.length} students...
              </div>
            )}

            {!bulkGenerating && reviewStudents.length > 0 && Object.keys(bulkComments).length > 0 && (
              <div className="mt-4 space-y-4">
                {reviewStudents.map((student) => {
                  const entry = bulkComments[student.id]

                  if (!entry) return null

                  return (
                    <div
                      key={student.id}
                      className="rounded-xl border border-gray-100 bg-white px-4 py-4"
                    >
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Roll {student.roll_no} · Class {student.class_num} · {student.stage ?? '—'}
                        </div>
                      </div>

                      {entry.error || !entry.report ? (
                        <div className="text-xs text-red-600">
                          {entry.error ?? 'Failed to load report data.'}
                        </div>
                      ) : (
                        <ReportCommentGenerator
                          studentName={student.name}
                          className={student.class_num}
                          subjectGrades={entry.report.subjectGrades}
                          attendancePct={entry.report.attendancePct}
                          presentCount={entry.report.presentCount}
                          absentCount={entry.report.absentCount}
                          totalDays={entry.report.totalDays}
                          initialComment={entry.comment}
                          generateLabel="Regenerate"
                          showHeader={false}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {filteredStudents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No students found
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredStudents.map(s => {
              const isReleased = releaseMap[Number(s.class_num)]?.released === true
              return (
                <div key={s.id} className="px-5 py-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Roll {s.roll_no} · Class {s.class_num} · {s.stage ?? '—'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                          isReleased
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}
                      >
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
