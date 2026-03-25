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

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, priority, created_by, created_at')
    .order('created_at', { ascending: false })

  // Look up creator roles to use as display identity
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
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Announcements</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {isStaff && <ComposeAnnouncement userId={user.id} />}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">All announcements</h2>
              </div>
              {announcements && announcements.length > 0 ? announcements.map((a: any) => (
                <div key={a.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      {a.priority !== 'normal' && (
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityBadge[a.priority] ?? 'bg-gray-50 text-gray-600'}`}>
                          {priorityLabel[a.priority] ?? a.priority}
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
              )) : (
                <div className="px-5 py-10 text-center text-sm text-gray-400">No announcements yet</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
