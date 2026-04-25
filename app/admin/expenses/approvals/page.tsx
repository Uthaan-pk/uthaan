import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ApprovalsClient, { type ExpenseRecord } from './ApprovalsClient'
import { resolveEffectiveRole } from '@/lib/school'

export default async function AdminExpenseApprovalsPage() {
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

  const role = roleData?.role
  const effectiveRole = await resolveEffectiveRole(role ?? '')

  if (effectiveRole !== 'admin') redirect('/dashboard')

  const { data: expenses } = await supabase
    .from('petty_expenses')
    .select(
      'id, title, category, amount, expense_date, vendor, description, status, approved_at, rejection_reason, created_at, created_by',
    )
    .order('created_at', { ascending: false })
    .limit(500)

  const pendingCount = (expenses ?? []).filter((e) => e.status === 'pending_approval').length

  return (
    <div className="uthaan-page-shell">
      <Sidebar
        email={user.email!}
        role="admin"
        isImpersonating={role === 'superadmin'}
      />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Expense Approvals</h1>
          <div className="flex items-center gap-2">
            {pendingCount > 0 ? (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
                {pendingCount} pending
              </span>
            ) : (
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                All clear
              </span>
            )}
          </div>
        </header>
        <main className="uthaan-page-content">
          <ApprovalsClient
            initialExpenses={(expenses ?? []) as ExpenseRecord[]}
          />
        </main>
      </div>
    </div>
  )
}
