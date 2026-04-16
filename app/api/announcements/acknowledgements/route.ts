import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/api/validate'

/**
 * GET /api/announcements/acknowledgements?ids=id1,id2,...
 *
 * Batch acknowledgement status for a list of announcement IDs.
 * Returns { [announcementId]: { count, total } } for admin/teacher only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = url.searchParams.get('ids') ?? ''
  const ids = raw.split(',').map(s => s.trim()).filter(s => isValidUUID(s))

  if (ids.length === 0) {
    return NextResponse.json({})
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData?.school_id || !['admin', 'teacher'].includes(roleData.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const schoolId = roleData.school_id as string

  // Fetch all acks for the given announcements in one query
  const { data: acks } = await supabase
    .from('announcement_acknowledgements')
    .select('announcement_id, user_id')
    .in('announcement_id', ids)
    .eq('school_id', schoolId)

  // Fetch class_num for each announcement
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, class_num')
    .in('id', ids)

  // Fetch all active students to compute per-class totals
  const { data: students } = await supabase
    .from('students')
    .select('id, class_num')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  // Build class → count map (key 'null' means school-wide)
  const classCountMap: Record<string, number> = {}
  let totalStudents = 0
  for (const s of students ?? []) {
    totalStudents++
    const key = s.class_num != null ? String(s.class_num) : 'null'
    classCountMap[key] = (classCountMap[key] ?? 0) + 1
  }

  // Group ack counts by announcement_id
  const ackCountMap: Record<string, number> = {}
  for (const a of acks ?? []) {
    ackCountMap[a.announcement_id] = (ackCountMap[a.announcement_id] ?? 0) + 1
  }

  // Build result
  const result: Record<string, { count: number; total: number }> = {}
  const annMap = Object.fromEntries((announcements ?? []).map(a => [a.id, a]))

  for (const id of ids) {
    const ann = annMap[id]
    const total =
      ann?.class_num != null
        ? (classCountMap[String(ann.class_num)] ?? 0)
        : totalStudents
    result[id] = { count: ackCountMap[id] ?? 0, total }
  }

  return NextResponse.json(result)
}
