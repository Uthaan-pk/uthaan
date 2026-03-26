export type GradeWeights = {
  assignment_weight: number
  exam_weight: number
  final_weight: number
  quiz_weight: number
}

export type GradeInput = {
  assignmentAvg: number | null
  examAvg: number | null
  finalAvg: number | null
  quizAvg: number | null
}

export type GradeResult = {
  overall: number  // 0–100
  letter: string
}

export function letterGrade(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

/**
 * Parse a text grade string into a 0–100 number.
 * Handles: "85/100", "8/10", "85%", "85", "A+", "A", "B", "C", "D", "F".
 * Returns null for unrecognised formats.
 */
export function parseGradeText(grade: string): number | null {
  const g = grade.trim()

  // "85/100" or "8/10"
  const slash = g.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (slash) {
    const den = parseFloat(slash[2])
    return den > 0 ? Math.min(100, (parseFloat(slash[1]) / den) * 100) : null
  }

  // "85%" or "85 %"
  const pct = g.match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (pct) return Math.min(100, parseFloat(pct[1]))

  // bare number "85" — only treat as % if ≤ 100
  const num = g.match(/^(\d+(?:\.\d+)?)$/)
  if (num) {
    const n = parseFloat(num[1])
    if (n <= 100) return n
  }

  // letter grades → midpoint representative values
  const map: Record<string, number> = {
    'A+': 95, 'A': 85, 'B': 75, 'C': 65, 'D': 55, 'F': 25,
  }
  return map[g.toUpperCase()] ?? null
}

/**
 * Compute an overall weighted grade.
 * Categories with null input or zero weight are excluded;
 * their weight is redistributed proportionally among available categories.
 * Returns null when no category has data.
 */
export function calculateGrade(input: GradeInput, weights: GradeWeights): GradeResult | null {
  const cats = [
    { value: input.assignmentAvg, weight: weights.assignment_weight },
    { value: input.examAvg,       weight: weights.exam_weight       },
    { value: input.finalAvg,      weight: weights.final_weight      },
    { value: input.quizAvg,       weight: weights.quiz_weight       },
  ]

  const available = cats.filter(c => c.value !== null && c.weight > 0)
  if (available.length === 0) return null

  const totalWeight = available.reduce((s, c) => s + c.weight, 0)
  if (totalWeight === 0) return null

  const overall = available.reduce((s, c) => s + c.value! * c.weight, 0) / totalWeight
  const rounded = Math.round(overall * 10) / 10

  return { overall: rounded, letter: letterGrade(rounded) }
}
