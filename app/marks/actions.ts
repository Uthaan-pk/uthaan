'use server'

import { createClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit'

export type ImportResult = {
  imported: number
  skipped: { row: number; reason: string }[]
}

/**
 * Parse and upsert marks from a CSV FormData upload.
 * Expected columns: student_id, subject, score (and optional: exam)
 */
export async function importMarksFromCSV(
  formData: FormData,
  schoolId: string,
  teacherVisibleSubjects: string[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: [{ row: 0, reason: 'Not authenticated' }] }

  const file = formData.get('csv') as File | null
  if (!file) return { imported: 0, skipped: [{ row: 0, reason: 'No file provided' }] }

  const text = await file.text()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return { imported: 0, skipped: [{ row: 0, reason: 'CSV is empty or has only a header row' }] }
  }

  // Parse header
  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const studentIdIdx = headers.indexOf('student_id')
  const subjectIdx = headers.indexOf('subject')
  const scoreIdx = headers.indexOf('score')
  const examIdx = headers.indexOf('exam')

  if (studentIdIdx === -1 || subjectIdx === -1 || scoreIdx === -1) {
    return {
      imported: 0,
      skipped: [{ row: 0, reason: 'Missing required columns: student_id, subject, score' }],
    }
  }

  // Fetch all student IDs in this school for validation
  const { data: schoolStudents } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  const validStudentIds = new Set((schoolStudents ?? []).map((s) => s.id))
  const normalizedSubjects = new Set(teacherVisibleSubjects.map((s) => s.toLowerCase()))

  const skipped: { row: number; reason: string }[] = []
  const toUpsert: { student_id: string; subject: string; exam: string; percent: number; school_id: string; source: string }[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const cols = lines[i].split(',').map((c) => c.trim())

    const studentId = cols[studentIdIdx] ?? ''
    const subject = cols[subjectIdx]?.toLowerCase() ?? ''
    const scoreRaw = cols[scoreIdx] ?? ''
    const exam = examIdx >= 0 ? (cols[examIdx]?.trim() || 'Unit Test') : 'Unit Test'

    if (!studentId) { skipped.push({ row: rowNum, reason: 'Missing student_id' }); continue }
    if (!validStudentIds.has(studentId)) { skipped.push({ row: rowNum, reason: `Student ${studentId} not found in school` }); continue }
    if (!subject) { skipped.push({ row: rowNum, reason: 'Missing subject' }); continue }
    if (normalizedSubjects.size > 0 && !normalizedSubjects.has(subject)) {
      skipped.push({ row: rowNum, reason: `Subject "${subject}" not in your timetable` }); continue
    }

    const score = parseFloat(scoreRaw)
    if (isNaN(score) || score < 0 || score > 100) {
      skipped.push({ row: rowNum, reason: `Invalid score "${scoreRaw}" (must be 0–100)` }); continue
    }

    toUpsert.push({
      student_id: studentId,
      subject,
      exam,
      percent: score,
      school_id: schoolId,
      source: 'csv_import',
    })
  }

  if (toUpsert.length === 0) {
    return { imported: 0, skipped }
  }

  const { error } = await supabase
    .from('marks')
    .upsert(toUpsert, { onConflict: 'student_id,subject,exam' })

  if (error) {
    skipped.push({ row: 0, reason: `DB error: ${error.message}` })
    return { imported: 0, skipped }
  }

  await writeAuditLog(supabase, {
    actor_user_id: user.id,
    action: 'insert',
    entity_type: 'marks',
    entity_id: schoolId,
    new_value: { source: 'csv_import', count: toUpsert.length },
  })

  return { imported: toUpsert.length, skipped }
}
