import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

type FeeRow = {
  amount: number
  paid: boolean
  due_date: string
  paid_at: string | null
}

type ExpenseRow = {
  status: string
  amount: number
  approved_at: string | null
  category: string
}

export default async function AccountingReportsPage() {
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

  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)

  const [feesRes, expensesRes] = await Promise.all([
    supabase.from('fees').select('amount, paid, due_date, paid_at'),
    supabase.from('petty_expenses').select('status, amount, approved_at, category'),
  ])

  const fees = (feesRes.data ?? []) as FeeRow[]
  const expenses = (expensesRes.data ?? []) as ExpenseRow[]

  const collectedToday = fees
    .filter((f) => f.paid && f.paid_at?.slice(0, 10) === today)
    .reduce((s, f) => s + Number(f.amount), 0)
  const collectedThisMonth = fees
    .filter((f) => f.paid && f.paid_at?.slice(0, 7) === thisMonth)
    .reduce((s, f) => s + Number(f.amount), 0)
  const outstanding = fees
    .filter((f) => !f.paid && f.due_date < today)
    .reduce((s, f) => s + Number(f.amount), 0)

  const approvedToday = expenses
    .filter((e) => e.status === 'approved' && e.approved_at?.slice(0, 10) === today)
    .reduce((s, e) => s + Number(e.amount), 0)
  const approvedThisMonth = expenses
    .filter((e) => e.status === 'approved' && e.approved_at?.slice(0, 7) === thisMonth)
    .reduce((s, e) => s + Number(e.amount), 0)
  const pendingCount = expenses.filter((e) => e.status === 'pending_approval').length

  const netToday = collectedToday - approvedToday
  const netThisMonth = collectedThisMonth - approvedThisMonth

  // Category totals this month (approved only)
  const categoryTotals = new Map<string, number>()
  expenses
    .filter((e) => e.status === 'approved' && e.approved_at?.slice(0, 7) === thisMonth)
    .forEach((e) => {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + Number(e.amount))
    })
  const categoryRows = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="accountant" />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Reports</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Finance summary
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">
            {/* Today */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="text-sm font-semibold text-gray-900">Today</div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Collected
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-green-700">
                    {fmt(collectedToday)}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Expenses approved
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-amber-700">
                    {fmt(approvedToday)}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    pendingCount > 0
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-gray-200 bg-[#fafcf9]'
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Pending approvals
                  </div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-tight ${
                      pendingCount > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {pendingCount}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    netToday >= 0
                      ? 'border-green-200 bg-green-50/70'
                      : 'border-red-200 bg-red-50/70'
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Net movement
                  </div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-tight ${
                      netToday >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {netToday >= 0 ? '+' : ''}{fmt(netToday)}
                  </div>
                </div>
              </div>
            </section>

            {/* This month */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="text-sm font-semibold text-gray-900">This month</div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Collected
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-green-700">
                    {fmt(collectedThisMonth)}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Approved expenses
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-amber-700">
                    {fmt(approvedThisMonth)}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    outstanding > 0
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-gray-200 bg-[#fafcf9]'
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Outstanding fees
                  </div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-tight ${
                      outstanding > 0 ? 'text-amber-700' : 'text-gray-900'
                    }`}
                  >
                    {fmt(outstanding)}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    netThisMonth >= 0
                      ? 'border-green-200 bg-green-50/70'
                      : 'border-red-200 bg-red-50/70'
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Net movement
                  </div>
                  <div
                    className={`mt-2 text-xl font-semibold tracking-tight ${
                      netThisMonth >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {netThisMonth >= 0 ? '+' : ''}{fmt(netThisMonth)}
                  </div>
                </div>
              </div>
            </section>

            {/* Expense categories this month */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900">
                  Expense categories this month
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Approved expense totals grouped by category.
                </div>
              </div>

              {categoryRows.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  No approved expenses this month.
                </div>
              ) : (
                categoryRows.map(([category, total], i) => {
                  const maxTotal = categoryRows[0][1]
                  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

                  return (
                    <div
                      key={category}
                      className={`px-5 py-4 ${
                        i < categoryRows.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-gray-800">{category}</span>
                        <span className="font-semibold text-gray-900 shrink-0">
                          {fmt(total)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#6fcf6f] transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
