import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TimetableGrid from './TimetableGrid'

export default async function TimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  // For students: get their class/stage to filter timetable
  let filterClass: string | null = null
  let filterStage: string | null = null
  if (!isStaff) {
    const { data: student } = await supabase
      .from('students')
      .select('class, stage')
      .eq('user_id', user.id)
      .single()
    filterClass = student?.class ?? null
    filterStage = student?.stage ?? null
  }

  // Fetch timetable rows (students see only their class)
  let query = supabase.from('timetable').select('*').order('period')
  if (!isStaff && filterClass) {
    query = query.eq('class', filterClass)
  }
  const { data: rows } = await query

  // Build teacher display map: user_id -> role label
  const teacherIds = [...new Set(
    (rows ?? []).map((r: any) => r.teacher_id).filter((id: any): id is string => !!id)
  )]
  const teacherMap: Record<string, string> = {}
  if (teacherIds.length > 0) {
    const { data: teacherRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', teacherIds)
    teacherRoles?.forEach(r => { teacherMap[r.user_id] = r.role })
  }

  // Staff only: fetch all staff for the teacher dropdown in the form
  let staffList: { user_id: string; role: string }[] = []
  if (isStaff) {
    const { data: sl } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['teacher', 'admin'])
    staffList = sl ?? []
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Timetable</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {filterClass ? `Class ${filterClass}${filterStage ? ` · ${filterStage}` : ''}` : 'Spring Term 2026'}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <TimetableGrid
            rows={rows ?? []}
            teacherMap={teacherMap}
            isStaff={isStaff}
            staffList={staffList}
          />
        </main>
      </div>
    </div>
  )
}
