import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

type SubjectGrade = {
  subject: string
  overall: number
  letter: string
}

type RequestBody = {
  studentName: string
  className: string | number
  subjectGrades: SubjectGrade[]
  attendancePct: number
  presentCount: number
  absentCount: number
  totalDays: number
}

function hasMissingRequiredFields(body: Partial<RequestBody>) {
  return (
    !body.studentName ||
    body.className === undefined ||
    body.className === null ||
    !Array.isArray(body.subjectGrades) ||
    typeof body.attendancePct !== 'number' ||
    typeof body.presentCount !== 'number' ||
    typeof body.absentCount !== 'number' ||
    typeof body.totalDays !== 'number'
  )
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'AI features not configured' },
      { status: 503 }
    )
  }

  const body = (await request.json()) as Partial<RequestBody>

  if (hasMissingRequiredFields(body)) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const {
    studentName,
    className,
    subjectGrades,
    attendancePct,
    presentCount,
    totalDays,
  } = body as RequestBody

  if (subjectGrades.length === 0) {
    return Response.json({ error: 'No grade data available' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  const role = roleData?.role ?? ''

  if (role === 'student' || role === 'parent') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!['teacher', 'admin', 'superadmin'].includes(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

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

    return Response.json({ comment }, { status: 200 })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: 'Failed to generate comment' },
      { status: 500 }
    )
  }
}
