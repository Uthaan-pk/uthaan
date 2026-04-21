import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'
import { writeAuditLog } from '@/lib/audit'

const DeleteStudentSchema = z.object({
  student_id: z.string().uuid(),
})

export async function POST(request: Request) {
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

  if (roleData?.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(DeleteStudentSchema, raw)
  if ('error' in parsed) return parsed.error
  const { student_id } = parsed.data

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('students')
    .update({ is_active: false })
    .eq('id', student_id)

  if (error) {
    console.error('[delete-student]', error)
    return NextResponse.json(
      { message: 'Failed to archive student' },
      { status: 500 }
    )
  }

  await writeAuditLog(supabase, {
    actor_user_id: user.id,
    action: 'delete',
    entity_type: 'student',
    entity_id: student_id,
    old_value: { is_active: true },
    new_value: { is_active: false },
  })

  return NextResponse.json({ success: true, archived: true })
}
