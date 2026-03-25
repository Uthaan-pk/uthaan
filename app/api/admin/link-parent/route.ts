import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { parentEmail, studentId } = await req.json()
  if (!parentEmail?.trim() || !studentId) {
    return NextResponse.json({ error: 'Parent email and student are required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Find user by email
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const parentUser = users.find(u => u.email === parentEmail.trim().toLowerCase())
  if (!parentUser) {
    return NextResponse.json({ error: 'No account found with that email address' }, { status: 404 })
  }

  // Upsert parent role
  await adminClient
    .from('user_roles')
    .upsert({ user_id: parentUser.id, role: 'parent' }, { onConflict: 'user_id' })

  // Insert link
  const { error: linkError } = await adminClient
    .from('parent_student')
    .insert({ parent_id: parentUser.id, student_id: studentId })

  if (linkError) {
    if (linkError.code === '23505') {
      return NextResponse.json({ error: 'This parent is already linked to that student' }, { status: 409 })
    }
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { linkId } = await req.json()
  if (!linkId) return NextResponse.json({ error: 'Link ID required' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('parent_student')
    .delete()
    .eq('id', linkId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
