import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TimetableGrid from './TimetableGrid'
import { CURRENT_TERM } from '@/lib/constants'
import { type TimetableRow } from './TimetableForm'
import { HelpButton } from '@/components/HelpButton'

export default async function TimetablePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isTeacher = role === 'teacher'
  const isStaff = role === 'teacher' || role === 'admin'

  let filterClassNum: number | null = null

  if (!isStaff && roleData?.student_id) {
    const { data: student } = await supabase
      .from('students')
      .select('class_num')
      .eq('id', roleData.student_id)
      .eq('is_active', true)
      .single()

    filterClassNum = student?.class_num ?? null
  }

  let query = supabase
    .from('timetable')
    .select('*')
    .order('class_num', { ascending: true })
    .order('day', { ascending: true })
    .order('period', { ascending: true })

  if (isTeacher) {
    query = query.eq('teacher_id', user.id)
  }

  if (!isStaff && filterClassNum !== null) {
    query = query.eq('class_num', filterClassNum)
  }

  const { data: rows } = await query

  const teacherIds = [
    ...new Set(
      (rows ?? [])
        .map((r: any) => r.teacher_id)
        .filter((id: any): id is string => !!id)
    ),
  ]

  const teacherMap: Record<string, string> = {}

  if (teacherIds.length > 0) {
    const { data: teacherRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', teacherIds)

    teacherRoles?.forEach(r => {
      teacherMap[r.user_id] =
        r.role === 'admin'
          ? 'Admin'
          : r.role === 'teacher'
            ? 'Teacher'
            : 'Staff'
    })
  }

  let availableClasses: number[] = []
  let staffList: { user_id: string; role: string }[] = []

  if (isStaff) {
    if (!isTeacher) {
      // Admins: show tabs for every class that has active students
      const { data: classData } = await supabase
        .from('students')
        .select('class_num')
        .eq('is_active', true)
        .not('class_num', 'is', null)

      const uniqueClasses = [
        ...new Set((classData ?? []).map((s: any) => s.class_num as number)),
      ]

      availableClasses = uniqueClasses.sort((a, b) => a - b)
    }
    // Teachers: availableClasses stays [] — TimetableGrid derives tabs from
    // their own rows (already filtered by teacher_id above), so only classes
    // they are actually assigned to appear as tabs.

    const { data: sl } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['teacher', 'admin'])

    staffList = sl ?? []
  }

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Timetable</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {filterClassNum ? `Class ${filterClassNum}` : CURRENT_TERM}
            </span>
            <HelpButton pageKey="timetable" />
          </div>
        </header>

        <main className="uthaan-page-content">
          <TimetableGrid
            rows={(rows as unknown as TimetableRow[]) ?? []}
            teacherMap={teacherMap}
            currentUserId={user.id}
            currentRole={role ?? ''}
            staffList={staffList}
            availableClasses={availableClasses}
          />
        </main>
      </div>
    </div>
  )
}
