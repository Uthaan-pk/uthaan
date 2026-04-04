import { calculateGrade, letterGrade, type GradeWeights } from './calculateGrade'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FlatMarkRow = {
  student_id: string
  subject: string
  exam: string
  percent: number | null
}

export type WeightRow = {
  id: string
  class_num: number
  subject: string
  assignment_weight: number
  exam_weight: number
  final_weight: number
  quiz_weight: number
}

export type SubjectGrade = {
  subject: string
  displayName: string
  overall: number
  letter: string
}

// ── Display helpers ───────────────────────────────────────────────────────────

const SUBJECT_DISPLAY: Record<string, string> = {
  urdu: 'Urdu',
  english: 'English',
  math: 'Mathematics',
  mathematics: 'Mathematics',
  science: 'Science',
  islamiat: 'Islamiat',
  pakistan_studies: 'Pakistan Studies',
  computer: 'Computer Science',
  biology: 'Biology',
  chemistry: 'Chemistry',
  physics: 'Physics',
}

export function fmtSubject(s: string): string {
  return (
    SUBJECT_DISPLAY[s?.toLowerCase?.() ?? ''] ??
    (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—')
  )
}

// ── Data builders ─────────────────────────────────────────────────────────────

/**
 * Convert a flat marks array into the nested structure used by MarksEditor:
 *   allMarks[exam][studentId][subject] = percent
 */
export function buildAllMarksData(
  marks: FlatMarkRow[]
): Record<string, Record<string, Record<string, number | null>>> {
  const result: Record<string, Record<string, Record<string, number | null>>> = {}
  for (const m of marks) {
    if (!result[m.exam]) result[m.exam] = {}
    if (!result[m.exam][m.student_id]) result[m.exam][m.student_id] = {}
    result[m.exam][m.student_id][m.subject.toLowerCase()] = m.percent
  }
  return result
}

// ── Grade computation ─────────────────────────────────────────────────────────

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && !isNaN(v))
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

/**
 * Compute a final grade for each subject that has at least one mark recorded.
 *
 * Mapping of exam names → GradeInput fields:
 *   'Mid Term'   → examAvg
 *   'Final Term' → finalAvg
 *   'Unit Test'  → assignmentAvg (falls back to assignmentAvg arg if no Unit Test)
 *
 * If a WeightRow exists for the subject, uses calculateGrade with those weights.
 * Otherwise falls back to a simple average across all available exam values.
 */
export function computeSubjectFinalGrades(
  studentId: string,
  marks: FlatMarkRow[],
  weightRows: WeightRow[],
  quizAvg: number | null = null,
  assignmentAvg: number | null = null,
): SubjectGrade[] {
  // Bucket marks by subject and exam type
  const bySubject: Record<
    string,
    { mid: number | null; final: number | null; unit: number | null }
  > = {}

  for (const m of marks) {
    if (m.student_id !== studentId || m.percent == null) continue
    const sub = m.subject.toLowerCase()
    if (!bySubject[sub]) bySubject[sub] = { mid: null, final: null, unit: null }
    if (m.exam === 'Mid Term')        bySubject[sub].mid   = m.percent
    else if (m.exam === 'Final Term') bySubject[sub].final = m.percent
    else if (m.exam === 'Unit Test')  bySubject[sub].unit  = m.percent
  }

  const result: SubjectGrade[] = []

  for (const [subject, exams] of Object.entries(bySubject)) {
    const available = [exams.mid, exams.final, exams.unit].filter(
      (v): v is number => v != null
    )
    if (available.length === 0) continue

    const weights = weightRows.find(w => w.subject.toLowerCase() === subject)

    let overall: number
    if (weights) {
      const gradeWeights: GradeWeights = {
        assignment_weight: weights.assignment_weight,
        exam_weight:       weights.exam_weight,
        final_weight:      weights.final_weight,
        quiz_weight:       weights.quiz_weight,
      }
      const gr = calculateGrade(
        {
          examAvg:       exams.mid,
          finalAvg:      exams.final,
          assignmentAvg: exams.unit ?? assignmentAvg,
          quizAvg,
        },
        gradeWeights
      )
      overall = gr ? gr.overall : avg(available)!
    } else {
      overall = avg(available)!
    }

    const rounded = Math.round(overall * 10) / 10
    result.push({
      subject,
      displayName: fmtSubject(subject),
      overall:     rounded,
      letter:      letterGrade(rounded),
    })
  }

  return result.sort((a, b) => a.subject.localeCompare(b.subject))
}
