import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

  if (!roleData?.school_id || !['admin', 'teacher'].includes(roleData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = roleData.school_id as string

  // Fetch all acknowledgements for this announcement in this school
  const { data: acks, error: acksError } = await supabase
    .from('announcement_acknowledgements')
    .select('user_id, acknowledged_at')
    .eq('announcement_id', id)
    .eq('school_id', schoolId)

  if (acksError) return NextResponse.json({ error: acksError.message }, { status: 500 })

  // Resolve display names for acknowledged users
  const ackedUserIds = (acks ?? []).map((a) => a.user_id)
  let names: string[] = []

  if (ackedUserIds.length > 0) {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, student_id, role')
      .in('user_id', ackedUserIds)
      .eq('school_id', schoolId)

    const studentIds = (roles ?? [])
      .filter((r) => r.student_id)
      .map((r) => r.student_id as string)

    const nameMap: Record<string, string> = {}
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds)
      students?.forEach((s) => {
        nameMap[s.id] = s.name
      })
    }

    names = (roles ?? []).map((r) =>
      r.student_id && nameMap[r.student_id] ? nameMap[r.student_id] : 'Parent'
    )
  }

  // Count total eligible students for this announcement
  const { data: announcement } = await supabase
    .from('announcements')
    .select('class_num')
    .eq('id', id)
    .single()

  let countQuery = supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  if (announcement?.class_num != null) {
    countQuery = countQuery.eq('class_num', announcement.class_num)
  }

  const { count: total } = await countQuery

  return NextResponse.json({
    count: acks?.length ?? 0,
    total: total ?? 0,
    names,
  })
}
