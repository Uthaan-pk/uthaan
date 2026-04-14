import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData?.school_id || !['student', 'parent'].includes(roleData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('announcement_acknowledgements').insert({
    announcement_id: id,
    user_id: user.id,
    school_id: roleData.school_id,
  })

  // 23505 = unique_violation — already acknowledged, treat as success
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
