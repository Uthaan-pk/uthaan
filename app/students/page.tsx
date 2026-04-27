import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import StudentsTable from './StudentsTable'
import { buildAttendanceMap } from '@/lib/attendanceLeaves'
import { TERM_START_DATE } from '@/lib/constants'
import { HelpButton } from '@/components/HelpButton'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentsPage() {
  noStore()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const schoolContext = await getSchoolContext(supabase, user.id)

  if (role === 'student') redirect('/dashboard')
  if (role === 'superadmin' && !schoolContext?.schoolId) redirect('/superadmin')

  const dataClient = role === 'superadmin' ? createAdminClient() : supabase

  let studentsQuery = dataClient
    .from('students')
    .select('id, name, roll_no, email, stage, class_num, created_at, is_active')
    .eq('is_active', true)
    .order('name')

  let attendanceQuery = dataClient
    .from('attendance_logs')
    .select('student_id, status')
    .gte('day', TERM_START_DATE)

  if (schoolContext?.schoolId) {
    studentsQuery = studentsQuery.eq('school_id', schoolContext.schoolId)
    attendanceQuery = attendanceQuery.eq('school_id', schoolContext.schoolId)
  }

  const [{ data: students }, { data: attLogs }] = await Promise.all([
    studentsQuery,
    attendanceQuery,
  ])

  const attendanceMap = buildAttendanceMap(attLogs ?? [])

  return (
    <div className="uthaan-page-shell">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />

      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Students</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {students?.length ?? 0} enrolled
            </span>
            <HelpButton pageKey="students-import" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <StudentsTable students={students ?? []} attendanceMap={attendanceMap} />
        </main>
      </div>
    </div>
  )
}
