import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { resolveEffectiveRole } from '@/lib/school'
import LeaveManager from './LeaveManager'

type StudentOption = {
  id: string
  name: string
  roll_no: string
  class_num: number | null
}

export default async function AdminLeavesPage() {
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

  if (effectiveRole !== 'admin') redirect('/dashboard')

  const [studentsRes, leavesRes, earlyLeavesRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, roll_no, class_num')
      .eq('is_active', true)
      .order('class_num', { ascending: true })
      .order('name', { ascending: true })
      .limit(2000),
    supabase
      .from('student_leaves')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('student_early_leaves')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar
        email={user.email!}
        role={effectiveRole}
        isImpersonating={role === 'superadmin'}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Leave Management</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Admin only
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <LeaveManager
            students={(studentsRes.data ?? []) as StudentOption[]}
            initialLeaves={leavesRes.data ?? []}
            initialEarlyLeaves={earlyLeavesRes.data ?? []}
          />
        </main>
      </div>
    </div>
  )
}
