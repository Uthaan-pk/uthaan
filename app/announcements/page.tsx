import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ComposeAnnouncement from './ComposeAnnouncement'
import { CURRENT_TERM } from '@/lib/constants'
import AnnouncementList from './AnnouncementList'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'
import { createAdminClient } from '@/lib/supabase/admin'
import { HelpButton } from '@/components/HelpButton'
import { getFeatureLimit } from '@/lib/featureGate'


export default async function AnnouncementsPage() {
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
  const effectiveRole = await resolveEffectiveRole(role ?? '')
  const schoolContext = await getSchoolContext(supabase, user.id)
  const isStaff = effectiveRole === 'teacher' || effectiveRole === 'admin'
  if (role === 'superadmin' && !schoolContext?.schoolId) redirect('/superadmin')

  if (isStaff) {
    const dataClient = role === 'superadmin' ? createAdminClient() : supabase
    let announcementsQuery = dataClient
      .from('announcements')
      .select('id, title, body, priority, class_num, created_by, created_at')
      .order('created_at', { ascending: false })

    if (schoolContext?.schoolId) {
      announcementsQuery = announcementsQuery.eq('school_id', schoolContext.schoolId)
    }

    const { data: announcements } = await announcementsQuery

    let announceLimitReached = false
    let announceMonthLimit = 0
    if (schoolContext?.schoolId) {
      const feat = await getFeatureLimit(schoolContext.schoolId, 'unlimited_announcements')
      if (!feat.enabled && feat.limit > 0) {
        const nowMonth = new Date().toISOString().slice(0, 7)
        const thisMonthCount = (announcements ?? []).filter(
          a => a.created_at?.slice(0, 7) === nowMonth
        ).length
        announceMonthLimit = feat.limit
        announceLimitReached = thisMonthCount >= feat.limit
      }
    }

    const creatorIds = [
      ...new Set(
        (announcements ?? [])
          .map(a => a.created_by)
          .filter((id): id is string => !!id)
      ),
    ]

    const creatorRoleMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const adminClient = createAdminClient()
      const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const creatorSet = new Set(creatorIds)
      usersData?.users
        .filter(u => creatorSet.has(u.id))
        .forEach(u => {
          if (u.email) creatorRoleMap[u.id] = u.email.split('@')[0]
        })
    }

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={effectiveRole} isImpersonating={role === 'superadmin'} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                {CURRENT_TERM}
              </span>
              <HelpButton pageKey="announcements" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-7xl space-y-5">
              {announceLimitReached ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-xs text-amber-700">
                  Monthly announcement limit reached ({announceMonthLimit}/month on this plan). Upgrade to Growth for unlimited announcements.
                </div>
              ) : (
                <ComposeAnnouncement />
              )}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    All announcements
                  </h2>
                </div>
                <AnnouncementList
                  announcements={announcements ?? []}
                  creatorRoleMap={creatorRoleMap}
                  currentUserId={user.id}
                  isStaff={true}
                  currentUserRole={effectiveRole}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // ── Parent ──────────────────────────────────────────────────────────────────
  if (role === 'parent') {
    const { data: link } = await supabase
      .from('parent_student')
      .select('student_id')
      .eq('parent_id', user.id)
      .single()

    if (!link) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No child linked to your account
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator to link your child.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num')
      .eq('id', link.student_id)
      .eq('is_active', true)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Student record not found
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, body, priority, class_num, created_by, created_at')
      .or(`class_num.eq.${child.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    const creatorIds = [
      ...new Set(
        (announcements ?? [])
          .map((a: any) => a.created_by)
          .filter((id: any): id is string => !!id)
      ),
    ]

    const creatorRoleMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const adminClient = createAdminClient()
      const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const creatorSet = new Set(creatorIds)
      usersData?.users
        .filter(u => creatorSet.has(u.id))
        .forEach(u => {
          if (u.email) creatorRoleMap[u.id] = u.email.split('@')[0]
        })
    }

    const parentAcknowledgedIds = new Set<string>()
    const announcementIds = (announcements ?? []).map(a => a.id)
    if (announcementIds.length > 0) {
      const { data: acks } = await supabase
        .from('announcement_acknowledgements')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', announcementIds)
      acks?.forEach(a => parentAcknowledgedIds.add(a.announcement_id))
    }

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
                Viewing as: {child.name}
              </span>
              <HelpButton pageKey="announcements" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Announcements
                  </h2>
                </div>
                <AnnouncementList
                  announcements={announcements ?? []}
                  creatorRoleMap={creatorRoleMap}
                  currentUserId={user.id}
                  isStaff={false}
                  acknowledgedIds={parentAcknowledgedIds}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    if (!roleData?.student_id) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role ?? ''} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to a student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, class_num')
      .eq('id', roleData.student_id)
      .eq('is_active', true)
      .single()

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role ?? ''} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to an active student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, body, priority, class_num, created_by, created_at')
      .or(`class_num.eq.${student.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    const creatorIds = [
      ...new Set(
        (announcements ?? [])
          .map(a => a.created_by)
          .filter((id): id is string => !!id)
      ),
    ]

    const creatorRoleMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const adminClient = createAdminClient()
      const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const creatorSet = new Set(creatorIds)
      usersData?.users
        .filter(u => creatorSet.has(u.id))
        .forEach(u => {
          if (u.email) creatorRoleMap[u.id] = u.email.split('@')[0]
        })
    }

    const studentAcknowledgedIds = new Set<string>()
    const announcementIds = (announcements ?? []).map(a => a.id)
    if (announcementIds.length > 0) {
      const { data: acks } = await supabase
        .from('announcement_acknowledgements')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', announcementIds)
      acks?.forEach(a => studentAcknowledgedIds.add(a.announcement_id))
    }

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                Class {student.class_num}
              </span>
              <HelpButton pageKey="announcements" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-6xl">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Announcements
                  </h2>
                </div>
                <AnnouncementList
                  announcements={announcements ?? []}
                  creatorRoleMap={creatorRoleMap}
                  currentUserId={user.id}
                  isStaff={false}
                  acknowledgedIds={studentAcknowledgedIds}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900 mb-1">
            Unsupported account role
          </div>
          <div className="text-xs text-gray-400">
            Contact the school administrator.
          </div>
        </div>
      </div>
    </div>
  )
}
