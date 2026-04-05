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

export type ExamType = {
  id: string
  name: string
  category: 'mid' | 'final' | 'unit'
}

/** Default mapping for the three built-in exam names */
export const DEFAULT_EXAM_CATEGORY_MAP: Record<string, 'mid' | 'final' | 'unit'> = {
  'Mid Term':   'mid',
  'Final Term': 'final',
  'Unit Test':  'unit',
}

/** Build a name→category map from an ExamType array (falls back to DEFAULT if empty) */
export function buildExamCategoryMap(
  examTypes: ExamType[]
): Record<string, 'mid' | 'final' | 'unit'> {
  if (examTypes.length === 0) return DEFAULT_EXAM_CATEGORY_MAP
  const map: Record<string, 'mid' | 'final' | 'unit'> = {}
  for (const et of examTypes) map[et.name] = et.category
  return map
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
 * examCategoryMap maps exam names → 'mid' | 'final' | 'unit'.
 * Multiple marks in the same category are averaged together.
 * Defaults to the three built-in exam names when not provided.
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
  examCategoryMap: Record<string, 'mid' | 'final' | 'unit'> = DEFAULT_EXAM_CATEGORY_MAP,
): SubjectGrade[] {
  // Bucket marks by subject → category → values[]
  const bySubject: Record<string, { mid: number[]; final: number[]; unit: number[] }> = {}

  for (const m of marks) {
    if (m.student_id !== studentId || m.percent == null) continue
    const sub = m.subject.toLowerCase()
    if (!bySubject[sub]) bySubject[sub] = { mid: [], final: [], unit: [] }
    const cat = examCategoryMap[m.exam] ?? 'unit'
    bySubject[sub][cat].push(m.percent)
  }

  const result: SubjectGrade[] = []

  for (const [subject, exams] of Object.entries(bySubject)) {
    const midAvg   = avg(exams.mid)
    const finalAvg = avg(exams.final)
    const unitAvg  = avg(exams.unit)

    const available = [midAvg, finalAvg, unitAvg].filter((v): v is number => v != null)
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
          examAvg:       midAvg,
          finalAvg:      finalAvg,
          assignmentAvg: unitAvg ?? assignmentAvg,
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
