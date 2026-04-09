import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import AuditLogTable from './AuditLogTable'

export type AuditEntry = {
  id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export default async function AuditLogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)

  if (effectiveRole !== 'admin' && effectiveRole !== 'superadmin') {
    redirect('/dashboard')
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, actor_user_id, action, entity_type, entity_id, old_value, new_value, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Resolve actor emails for display
  const actorIds = Array.from(
    new Set((logs ?? []).map((l) => l.actor_user_id).filter(Boolean))
  ) as string[]

  const actorMap: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', actorIds)
    for (const a of actors ?? []) {
      actorMap[a.user_id] = a.role
    }
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Audit Log</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Last 100 entries
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl">
            <AuditLogTable logs={(logs ?? []) as AuditEntry[]} actorMap={actorMap} />
          </div>
        </main>
      </div>
    </div>
  )
}
