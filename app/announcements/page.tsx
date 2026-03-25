import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ComposeAnnouncement from './ComposeAnnouncement'

const priorityBadge: Record<string, string> = {
  important: 'bg-amber-50 text-amber-800',
  urgent: 'bg-red-50 text-red-700',
}

const priorityLabel: Record<string, string> = {
  important: 'Important',
  urgent: 'Urgent',
}

export default async function AnnouncementsPage() {
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

  if (isStaff) {
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, body, priority, class_num, created_by, created_at')
      .order('created_at', { ascending: false })

    const creatorIds = [...new Set(
      (announcements ?? []).map(a => a.created_by).filter((id): id is string => !!id)
    )]
    const creatorRoleMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)
      creatorRoles?.forEach(r => { creatorRoleMap[r.user_id] = r.role })
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Announcements</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Spring Term 2026
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl">
              <ComposeAnnouncement userId={user.id} />
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">All announcements</h2>
                </div>
                <AnnouncementList announcements={announcements ?? []} creatorRoleMap={creatorRoleMap} />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Parent view — same as student view but via parent_student
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
              <div className="text-sm font-medium text-gray-900 mb-1">No child linked to your account</div>
              <div className="text-xs text-gray-400">Contact the school administrator to link your child.</div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num')
      .eq('id', link.student_id)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">Student record not found</div>
              <div className="text-xs text-gray-400">Contact the school administrator.</div>
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

    const creatorIds = [...new Set(
      (announcements ?? []).map((a: any) => a.created_by).filter((id: any): id is string => !!id)
    )]
    const creatorRoleMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const { data: creatorRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', creatorIds)
      creatorRoles?.forEach(r => { creatorRoleMap[r.user_id] = r.role })
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Announcements</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">Announcements</h2>
                </div>
                <AnnouncementList announcements={announcements ?? []} creatorRoleMap={creatorRoleMap} />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Student view — look up by email to get class_num
  const { data: student } = await supabase
    .from('students')
    .select('id, class_num')
    .eq('email', user.email!)
    .single()

  if (!student) {
    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role ?? ''} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">No student record found</div>
            <div className="text-xs text-gray-400">Your account is not linked to a student. Contact your administrator.</div>
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

  const creatorIds = [...new Set(
    (announcements ?? []).map(a => a.created_by).filter((id): id is string => !!id)
  )]
  const creatorRoleMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: creatorRoles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', creatorIds)
    creatorRoles?.forEach(r => { creatorRoleMap[r.user_id] = r.role })
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Announcements</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Class {student.class_num}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Announcements</h2>
              </div>
              <AnnouncementList announcements={announcements ?? []} creatorRoleMap={creatorRoleMap} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function AnnouncementList({
  announcements,
  creatorRoleMap,
}: {
  announcements: any[]
  creatorRoleMap: Record<string, string>
}) {
  if (announcements.length === 0) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">No announcements yet</div>
  }
  return (
    <>
      {announcements.map((a: any) => (
        <div key={a.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {a.priority !== 'normal' && (
                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityBadge[a.priority] ?? 'bg-gray-50 text-gray-600'}`}>
                  {priorityLabel[a.priority] ?? a.priority}
                </span>
              )}
              {a.class_num != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25">
                  Class {a.class_num}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-300 shrink-0">
              {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900">{a.title}</div>
          <div className="text-xs text-gray-400 mt-1 leading-relaxed">{a.body}</div>
          <div className="text-[10px] text-gray-300 mt-2 capitalize">
            Posted by {creatorRoleMap[a.created_by] ?? 'staff'}
          </div>
        </div>
      ))}
    </>
  )
}
