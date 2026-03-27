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

  const { name, roll_no, email, stage, class_num } = await request.json()
  if (!name || !roll_no || !stage) return NextResponse.json({ error: 'Name, roll_no, and stage are required.' }, { status: 400 })

  const { data: existing } = await adminSupabase.from('students').select('id').eq('roll_no', roll_no).single()
  if (existing) return NextResponse.json({ error: `Roll number ${roll_no} is already taken.` }, { status: 400 })

  const { data: student, error } = await adminSupabase
    .from('students')
    .insert({ name, roll_no, email: email || null, stage, class_num: class_num || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (email) {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find((u: { email?: string }) => u.email === email)
    if (authUser) {
      const { data: existingRole } = await adminSupabase.from('user_roles').select('id').eq('user_id', authUser.id).eq('role', 'student').single()
      if (existingRole) {
        await adminSupabase.from('user_roles').update({ student_id: student.id }).eq('user_id', authUser.id).eq('role', 'student')
      } else {
        await adminSupabase.from('user_roles').insert({ user_id: authUser.id, role: 'student', student_id: student.id })
      }
    }
  }

  return NextResponse.json({ student })
}
