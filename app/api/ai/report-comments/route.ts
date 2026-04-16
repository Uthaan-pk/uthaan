import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseBody } from '@/lib/api/validate'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'
import {
  buildDefaultSchoolFeature,
  isNewUsageMonth,
  type SchoolFeatureRow,
} from '@/lib/aiFeatures'

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 120
const RATE_WINDOW_MS = 60_000

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  )
  if (timestamps.length >= RATE_LIMIT) return true
  rateLimitMap.set(userId, [...timestamps, now])
  return false
}

function readTextContent(response: Anthropic.Messages.Message) {
  return response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n')
    .trim()
}

function stripJsonFence(value: string) {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
}

const SubjectGradeSchema = z.object({
  subject: z.string().min(1).max(100),
  overall: z.number().min(0).max(100),
  letter: z.string().min(1).max(5),
})

const SingleRequestSchema = z.object({
  studentName: z.string().min(1).max(100),
  className: z.union([z.string().max(50), z.number()]),
  subjectGrades: z.array(SubjectGradeSchema).min(1).max(20),
  attendancePct: z.number().min(0).max(100),
  presentCount: z.number().int().min(0),
  absentCount: z.number().int().min(0),
  totalDays: z.number().int().min(0),
})

const BulkStudentSchema = z.object({
  studentId: z.string().min(1).max(100),
  studentName: z.string().min(1).max(100),
  subjectGrades: z.array(SubjectGradeSchema).min(1).max(20),
  attendancePct: z.number().min(0).max(100),
  presentCount: z.number().int().min(0),
  absentCount: z.number().int().min(0),
  totalDays: z.number().int().min(0),
})

const BulkRequestSchema = z.object({
  className: z.union([z.string().max(50), z.number()]),
  students: z.array(BulkStudentSchema).min(1).max(100),
})

const RequestSchema = z.union([SingleRequestSchema, BulkRequestSchema])

type BulkRequest = z.infer<typeof BulkRequestSchema>

function formatStudentSummary(student: BulkRequest['students'][number]) {
  const overallAverage = Math.round(
    student.subjectGrades.reduce((sum, grade) => sum + grade.overall, 0) /
      student.subjectGrades.length
  )

  const academicPerformance = student.subjectGrades
    .map(
      (grade) =>
        `${grade.subject} — ${grade.overall}% (Grade ${grade.letter})`
    )
    .join('\n')

  return `Student ID: ${student.studentId}
Student Name: ${student.studentName}
Academic performance:
${academicPerformance}
Overall average: ${overallAverage}%
Attendance: ${student.presentCount} days present out of ${student.totalDays} (${student.attendancePct}%)`
}

async function loadFeatureRow(schoolId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('school_features')
    .select('id, school_id, feature_key, enabled, monthly_limit, used_this_month, last_reset_at, created_at, updated_at')
    .eq('school_id', schoolId)
    .eq('feature_key', 'ai_report_comments')
    .maybeSingle()

  return { admin, row: data as SchoolFeatureRow | null }
}

async function ensureFeatureRow(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string
) {
  const { data } = await admin
    .from('school_features')
    .upsert(buildDefaultSchoolFeature(schoolId, 'ai_report_comments'), {
      onConflict: 'school_id,feature_key',
    })
    .select('id, school_id, feature_key, enabled, monthly_limit, used_this_month, last_reset_at, created_at, updated_at')
    .eq('feature_key', 'ai_report_comments')
    .single()

  return data as SchoolFeatureRow
}

async function ensureFeatureAvailable(schoolId: string) {
  const { admin, row } = await loadFeatureRow(schoolId)
  const fallbackRow = row ?? (await ensureFeatureRow(admin, schoolId))
  let feature = fallbackRow

  if (!feature.enabled) {
    return {
      admin,
      row: feature,
      error: NextResponse.json(
        { error: 'AI report comments are not enabled for this school' },
        { status: 403 }
      ),
    }
  }

  if (isNewUsageMonth(feature.last_reset_at)) {
    const resetAt = new Date().toISOString()
    const { data: updated } = await admin
      .from('school_features')
      .update({
        used_this_month: 0,
        last_reset_at: resetAt,
        updated_at: resetAt,
      })
      .eq('school_id', schoolId)
      .eq('feature_key', 'ai_report_comments')
      .select('id, school_id, feature_key, enabled, monthly_limit, used_this_month, last_reset_at, created_at, updated_at')
      .single()

    feature = (updated as SchoolFeatureRow | null) ?? {
      ...feature,
      used_this_month: 0,
      last_reset_at: resetAt,
      updated_at: resetAt,
    }
  }

  if (
    feature.monthly_limit !== null &&
    feature.used_this_month >= feature.monthly_limit
  ) {
    return {
      admin,
      row: feature,
      error: NextResponse.json(
        { error: 'Monthly AI usage limit reached for this school' },
        { status: 429 }
      ),
    }
  }

  return { admin, row: feature, error: null }
}

async function incrementFeatureUsage(admin: ReturnType<typeof createAdminClient>, schoolId: string) {
  const { data } = await admin
    .from('school_features')
    .select('id, school_id, feature_key, enabled, monthly_limit, used_this_month, last_reset_at, created_at, updated_at')
    .eq('school_id', schoolId)
    .eq('feature_key', 'ai_report_comments')
    .maybeSingle()

  const feature = (data as SchoolFeatureRow | null) ?? (await ensureFeatureRow(admin, schoolId))
  let usedThisMonth = feature.used_this_month

  if (isNewUsageMonth(feature.last_reset_at)) {
    usedThisMonth = 0
    const resetAt = new Date().toISOString()
    await admin
      .from('school_features')
      .update({
        used_this_month: 0,
        last_reset_at: resetAt,
        updated_at: resetAt,
      })
      .eq('school_id', schoolId)
      .eq('feature_key', 'ai_report_comments')
  }

  await admin
    .from('school_features')
    .update({
      used_this_month: usedThisMonth + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('school_id', schoolId)
    .eq('feature_key', 'ai_report_comments')
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schoolContext = await getSchoolContext(supabase, user.id)
  const effectiveRole = await resolveEffectiveRole(schoolContext?.role ?? '')

  if (!schoolContext?.schoolId || !['teacher', 'admin'].includes(effectiveRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  const featureResult = await ensureFeatureAvailable(schoolContext.schoolId)
  if (featureResult.error) return featureResult.error

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(RequestSchema, raw)
  if ('error' in parsed) return parsed.error

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const systemPrompt =
    'You are a professional school report card writer for a Pakistani school. Write concise, encouraging, and honest comments in formal English. Be specific about subjects. Never use placeholder text.'

  try {
    if ('students' in parsed.data) {
      const payload = parsed.data
      const studentSummaries = payload.students
        .map((student) => formatStudentSummary(student))
        .join('\n\n---\n\n')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: `${systemPrompt} For bulk requests, return only valid JSON with no markdown or commentary.`,
        messages: [
          {
            role: 'user',
            content: `Write report card comments for students in Class ${payload.className}.

Return ONLY valid JSON as an array.
Each array item must have exactly:
- "studentId": string
- "comment": string

Each comment must be 2-3 sentences maximum, reflect academic performance honestly, mention attendance only if notably good or concerning (below 75% is concerning), and end with an encouraging note.

Students:
${studentSummaries}`,
          },
        ],
      })

      const text = stripJsonFence(readTextContent(response))
      const parsedJson = JSON.parse(text) as Array<{ studentId: string; comment: string }>

      const comments = payload.students.map((student) => {
        const match = parsedJson.find((item) => item.studentId === student.studentId)
        return {
          studentId: student.studentId,
          comment: match?.comment?.trim() ?? '',
        }
      })

      if (comments.some((item) => !item.comment)) {
        throw new Error('AI response did not include comments for every student.')
      }

      await incrementFeatureUsage(featureResult.admin, schoolContext.schoolId)

      return NextResponse.json({ comments }, { status: 200 })
    }

    const {
      studentName,
      className,
      subjectGrades,
      attendancePct,
      presentCount,
      totalDays,
    } = parsed.data

    const overallAverage = Math.round(
      subjectGrades.reduce((sum, grade) => sum + grade.overall, 0) /
        subjectGrades.length
    )

    const academicPerformance = subjectGrades
      .map(
        (grade) =>
          `${grade.subject} — ${grade.overall}% (Grade ${grade.letter})`
      )
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `${systemPrompt} Write 2-3 sentences maximum.`,
      messages: [
        {
          role: 'user',
          content: `Write a report card comment for ${studentName} in Class ${className}.

Academic performance:
${academicPerformance}
Overall average: ${overallAverage}%

Attendance: ${presentCount} days present out of ${totalDays} (${attendancePct}%)

Write a comment that reflects academic performance honestly, mentions attendance if it is notably good or concerning (below 75% is concerning), and ends with an encouraging note.`,
        },
      ],
    })

    const comment = readTextContent(response)

    await incrementFeatureUsage(featureResult.admin, schoolContext.schoolId)

    return NextResponse.json({ comment }, { status: 200 })
  } catch (error) {
    console.error('[report-comments]', error)
    return NextResponse.json(
      { error: 'Failed to generate comment' },
      { status: 500 }
    )
  }
}
