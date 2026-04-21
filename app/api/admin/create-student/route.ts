import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'

const CreateStudentSchema = z.object({
  name: z.string().min(1).max(150),
  roll_no: z.string().min(1).max(50),
  email: z.string().email().max(254).optional().nullable(),
  stage: z.string().min(1).max(50),
  class_num: z.number().int().min(1).max(20).optional().nullable(),
})

export async function POST(request: Request) {
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

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(CreateStudentSchema, raw)
  if ('error' in parsed) return parsed.error
  const { name, roll_no, email, stage, class_num } = parsed.data

  const adminSupabase = createAdminClient()

  const { data: existing } = await adminSupabase
    .from('students')
    .select('id')
    .eq('roll_no', roll_no)
    .single()
  if (existing)
    return NextResponse.json(
      { message: `Roll number ${roll_no} is already taken.` },
      { status: 400 }
    )

  const { data: student, error } = await adminSupabase
    .from('students')
    .insert({
      name,
      roll_no,
      email: email || null,
      stage,
      class_num: class_num || null,
      school_id: schoolId,
    })
    .select()
    .single()

  if (error) {
    console.error('[create-student]', error)
    return NextResponse.json(
      { message: 'Failed to create student' },
      { status: 500 }
    )
  }

  if (email) {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(
      (u: { email?: string }) => u.email === email
    )
    if (authUser) {
      const { data: existingRole } = await adminSupabase
        .from('user_roles')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('role', 'student')
        .single()
      if (existingRole) {
        await adminSupabase
          .from('user_roles')
          .update({ student_id: student.id })
          .eq('user_id', authUser.id)
          .eq('role', 'student')
      } else {
        await adminSupabase
          .from('user_roles')
          .insert({ user_id: authUser.id, role: 'student', student_id: student.id })
      }
    }
  }

  return NextResponse.json({ student })
}
