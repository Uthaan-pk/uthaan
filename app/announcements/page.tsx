import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ComposeAnnouncement from './ComposeAnnouncement'
import { CURRENT_TERM } from '@/lib/constants'
import AnnouncementList from './AnnouncementList'


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
  const isStaff = role === 'teacher' || role === 'admin'

  if (isStaff) {
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, body, priority, class_num, created_by, created_at')
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
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)

      creatorRoles?.forEach(r => {
        creatorRoleMap[r.user_id] = r.role
      })
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl">
              <ComposeAnnouncement userId={user.id} />
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
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

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
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)

      creatorRoles?.forEach(r => {
        creatorRoleMap[r.user_id] = r.role
      })
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl">
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
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)

      creatorRoles?.forEach(r => {
        creatorRoleMap[r.user_id] = r.role
      })
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">
              Announcements
            </h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Class {student.class_num}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl">
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