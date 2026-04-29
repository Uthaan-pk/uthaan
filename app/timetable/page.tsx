import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import TimetableGrid from './TimetableGrid'
import { CURRENT_TERM } from '@/lib/constants'
import { type TimetableRow } from './TimetableForm'
import { HelpButton } from '@/components/HelpButton'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'
import { getFeatureStatus } from '@/lib/featureGate'
import FeatureLockedCard from '@/components/FeatureLockedCard'
import TrialBanner from '@/components/TrialBanner'

export default async function TimetablePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const effectiveRole = await resolveEffectiveRole(role ?? '')
  const schoolContext = await getSchoolContext(supabase, user.id)
  const isTeacher = effectiveRole === 'teacher'
  const isStaff = effectiveRole === 'teacher' || effectiveRole === 'admin'
  if (role === 'superadmin' && !schoolContext?.schoolId) redirect('/superadmin')

  let timetableTrialStatus = null
  if (isStaff && schoolContext?.schoolId) {
    const status = await getFeatureStatus(schoolContext.schoolId, 'timetable')
    if (!status.enabled) {
      return (
        <div className="uthaan-page-shell">
          <Sidebar email={user.email!} role={effectiveRole} isImpersonating={role === 'superadmin'} />
          {status.trialExpired ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8">
              <TrialBanner featureName="Timetable" status={status} />
              <FeatureLockedCard
                featureName="Timetable"
                description="Build and manage your school timetable."
                availableOn="Growth"
              />
            </div>
          ) : (
            <FeatureLockedCard
              featureName="Timetable"
              description="Build and manage your school timetable."
              availableOn="Growth"
            />
          )}
        </div>
      )
    }
    if (status.trialActive) timetableTrialStatus = status
  }

  const dataClient = role === 'superadmin' ? createAdminClient() : supabase

  let filterClassNum: number | null = null

  if (!isStaff && roleData?.student_id) {
    const { data: student } = await dataClient
      .from('students')
      .select('class_num')
      .eq('id', roleData.student_id)
      .eq('is_active', true)
      .single()

    filterClassNum = student?.class_num ?? null
  }

  let query = dataClient
    .from('timetable')
    .select('*')
    .order('class_num', { ascending: true })
    .order('day', { ascending: true })
    .order('period', { ascending: true })

  if (isTeacher) {
    query = query.eq('teacher_id', user.id)
  }

  if (schoolContext?.schoolId) {
    query = query.eq('school_id', schoolContext.schoolId)
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
    let teacherRolesQuery = dataClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', teacherIds)

    if (schoolContext?.schoolId) {
      teacherRolesQuery = teacherRolesQuery.eq('school_id', schoolContext.schoolId)
    }

    const { data: teacherRoles } = await teacherRolesQuery

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
      let classQuery = dataClient
        .from('students')
        .select('class_num')
        .eq('is_active', true)
        .not('class_num', 'is', null)

      if (schoolContext?.schoolId) {
        classQuery = classQuery.eq('school_id', schoolContext.schoolId)
      }

      const { data: classData } = await classQuery

      const uniqueClasses = [
        ...new Set((classData ?? []).map((s: any) => s.class_num as number)),
      ]

      availableClasses = uniqueClasses.sort((a, b) => a - b)
    }
    // Teachers: availableClasses stays [] — TimetableGrid derives tabs from
    // their own rows (already filtered by teacher_id above), so only classes
    // they are actually assigned to appear as tabs.

    let staffQuery = dataClient
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['teacher', 'admin'])

    if (schoolContext?.schoolId) {
      staffQuery = staffQuery.eq('school_id', schoolContext.schoolId)
    }

    const { data: sl } = await staffQuery

    staffList = sl ?? []
  }

  return (
    <div className="uthaan-page-shell">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />

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
          {timetableTrialStatus && (
            <TrialBanner featureName="Timetable" status={timetableTrialStatus} />
          )}
          <TimetableGrid
            rows={(rows as unknown as TimetableRow[]) ?? []}
            teacherMap={teacherMap}
            currentUserId={user.id}
            currentRole={effectiveRole}
            staffList={staffList}
            availableClasses={availableClasses}
          />
        </main>
      </div>
    </div>
  )
}
