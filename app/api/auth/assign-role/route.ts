import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'

const VALID_ROLES = ['student', 'teacher', 'parent'] as const

const AssignRoleSchema = z.object({
  role: z.enum(VALID_ROLES),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(AssignRoleSchema, raw)
  if ('error' in parsed) return parsed.error
  const { role } = parsed.data

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('user_roles')
    .insert({ user_id: user.id, role })

  if (error) {
    console.error('[assign-role]', error)
    return NextResponse.json(
      { message: 'Failed to assign role' },
      { status: 500 }
    )
  }
  return NextResponse.json({ success: true })
}
