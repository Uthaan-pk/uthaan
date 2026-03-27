import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TimetableGrid from './TimetableGrid'
import { type TimetableRow } from './TimetableForm'

export default async function TimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  let filterClassNum: number | null = null
  if (!isStaff && roleData?.student_id) {
    const { data: student } = await supabase
      .from('students')
      .select('class_num')
      .eq('id', roleData.student_id)
      .single()
    filterClassNum = student?.class_num ?? null
  }

  let query = supabase.from('timetable').select('*').order('period')
  if (!isStaff && filterClassNum !== null) {
    query = query.eq('class_num', filterClassNum)
  }
  const { data: rows } = await query

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

  let availableClasses: number[] = []
  let staffList: { user_id: string; role: string }[] = []
  if (isStaff) {
    const { data: classData } = await supabase
      .from('students')
      .select('class_num')
      .not('class_num', 'is', null)
    const uniqueClasses = [...new Set((classData ?? []).map((s: any) => s.class_num as number))]
    availableClasses = uniqueClasses.sort((a, b) => a - b)
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
            {filterClassNum ? `Class ${filterClassNum}` : 'Spring Term 2026'}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
