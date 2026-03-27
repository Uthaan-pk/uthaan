import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { parent_email, student_id } = await request.json()
  if (!parent_email || !student_id) return NextResponse.json({ error: 'Parent email and student ID are required.' }, { status: 400 })

  const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
  const parentUser = authUsers?.users?.find((u: { email?: string }) => u.email === parent_email)
  if (!parentUser) return NextResponse.json({ error: `No account found for ${parent_email}. Ask them to sign up first.` }, { status: 404 })

  const { data: parentRole } = await adminSupabase.from('user_roles').select('id').eq('user_id', parentUser.id).eq('role', 'parent').single()
  if (!parentRole) return NextResponse.json({ error: `${parent_email} did not select the Parent role when signing up.` }, { status: 400 })

  const { data: existingLink } = await adminSupabase.from('parent_student').select('id').eq('parent_id', parentUser.id).eq('student_id', student_id).single()
  if (existingLink) return NextResponse.json({ error: 'This parent is already linked to this student.' }, { status: 400 })

  const { data: link, error } = await adminSupabase.from('parent_student').insert({ parent_id: parentUser.id, student_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ link })
}
