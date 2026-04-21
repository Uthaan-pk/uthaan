import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BULK = 500

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()
  if (roleData?.role !== 'admin')
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  const schoolId = roleData?.school_id as string | null
  if (!schoolId)
    return NextResponse.json({ message: 'No school linked to your account' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const { students } = body as { students?: unknown }
  if (!Array.isArray(students) || students.length === 0)
    return NextResponse.json({ message: 'No students provided' }, { status: 400 })

  if (students.length > MAX_BULK)
    return NextResponse.json(
      { message: `Cannot import more than ${MAX_BULK} students at once.` },
      { status: 400 }
    )

  // Use the admin client for all DB writes — the user client is blocked by RLS
  // on the students table (same pattern as create-student/route.ts).
  const adminSupabase = createAdminClient()

  let added = 0,
    skipped = 0,
    linked = 0
  const errors: string[] = []

  for (const row of students) {
    if (typeof row !== 'object' || row === null) {
      errors.push('Skipped — invalid row format')
      skipped++
      continue
    }
    const { name, roll_no, email, class_num, stage } = row as Record<
      string,
      unknown
    >
    const nameStr = typeof name === 'string' ? name.trim() : ''
    const rollStr = typeof roll_no === 'string' ? roll_no.trim() : ''
    const classVal = class_num != null ? parseInt(String(class_num), 10) : NaN

    if (!nameStr || !rollStr || isNaN(classVal)) {
      errors.push(`Skipped — missing fields: ${nameStr || '(no name)'}`)
      skipped++
      continue
    }

    const { data: existing } = await adminSupabase
      .from('students')
      .select('id')
      .eq('roll_no', rollStr)
      .single()
    if (existing) {
      skipped++
      continue
    }

    const emailStr =
      typeof email === 'string' && email.trim() ? email.trim() : null

    const insertPayload = {
      name: nameStr,
      roll_no: rollStr,
      email: emailStr,
      class_num: classVal,
      stage: typeof stage === 'string' && stage.trim() ? stage.trim() : 'matric',
      school_id: schoolId,
    }
    const { data: newStudent, error: insertErr } = await adminSupabase
      .from('students')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertErr || !newStudent) {
      errors.push(`Failed to add ${nameStr}`)
      skipped++
      continue
    }
    added++

    if (emailStr) {
      // Must use adminSupabase — user client cannot access auth.admin
      const { data: authData } = await adminSupabase.auth.admin.listUsers()
      const match = authData?.users?.find(
        (u) => u.email?.toLowerCase() === emailStr.toLowerCase()
      )
      if (match) {
        await adminSupabase
          .from('user_roles')
          .update({ student_id: newStudent.id })
          .eq('user_id', match.id)
          .eq('role', 'student')
        linked++
      }
    }
  }

  return NextResponse.json({ added, skipped, linked, errors })
}
