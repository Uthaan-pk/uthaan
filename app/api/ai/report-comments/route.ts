import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'

// Simple in-memory rate limiter: max 10 requests per user per minute.
// Resets on cold starts — acceptable for lightweight spam prevention.
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
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

const SubjectGradeSchema = z.object({
  subject: z.string().min(1).max(100),
  overall: z.number().min(0).max(100),
  letter: z.string().min(1).max(5),
})

const RequestSchema = z.object({
  studentName: z.string().min(1).max(100),
  className: z.union([z.string().max(50), z.number()]),
  subjectGrades: z.array(SubjectGradeSchema).min(1).max(20),
  attendancePct: z.number().min(0).max(100),
  presentCount: z.number().int().min(0),
  absentCount: z.number().int().min(0),
  totalDays: z.number().int().min(0),
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { message: 'AI features not configured' },
      { status: 503 }
    )
  }

  // Use getUser() — cryptographically verifies the JWT server-side.
  // getSession() only reads the cookie without re-validating.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''

  if (!['teacher', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { message: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(RequestSchema, raw)
  if ('error' in parsed) return parsed.error

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

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const systemPrompt =
    'You are a professional school report card writer for a Pakistani school. Write concise, encouraging, and honest comments in formal English. Be specific about subjects. Never use placeholder text. Write 2-3 sentences maximum.'

  const userPrompt = `Write a report card comment for ${studentName} in Class ${className}.

Academic performance:
${academicPerformance}
Overall average: ${overallAverage}%

Attendance: ${presentCount} days present out of ${totalDays} (${attendancePct}%)

Write a comment that reflects their academic performance honestly, mentions attendance if it is notably good or concerning (below 75% is concerning), and ends with an encouraging note.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const comment = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n')
      .trim()

    return NextResponse.json({ comment }, { status: 200 })
  } catch (error) {
    console.error('[report-comments]', error)
    return NextResponse.json(
      { message: 'Failed to generate comment' },
      { status: 500 }
    )
  }
}
