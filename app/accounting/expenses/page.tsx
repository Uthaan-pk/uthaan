import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ExpensesClient from './ExpensesClient'

export default async function AccountingExpensesPage() {
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
  if (role !== 'accountant') redirect('/dashboard')

  const { data: expenses } = await supabase
    .from('petty_expenses')
    .select(
      'id, title, category, amount, expense_date, vendor, description, status, approved_at, rejection_reason, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="accountant" />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Expenses</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Petty expense requests
          </span>
        </header>
        <main className="uthaan-page-content">
          <ExpensesClient initialExpenses={expenses ?? []} />
        </main>
      </div>
    </div>
  )
}
