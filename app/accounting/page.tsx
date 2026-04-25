import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default async function AccountingPage() {
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
    supabase
      .from('petty_expenses')
      .select('status, amount, approved_at'),
  ])

  const fees = feesRes.data ?? []
  const expenses = expensesRes.data ?? []

  const collectedToday = fees
    .filter((f) => f.paid && (f.paid_at as string | null)?.slice(0, 10) === today)
    .reduce((s, f) => s + Number(f.amount ?? 0), 0)

  const collectedThisMonth = fees
    .filter((f) => f.paid && (f.paid_at as string | null)?.slice(0, 7) === thisMonth)
    .reduce((s, f) => s + Number(f.amount ?? 0), 0)

  const outstanding = fees
    .filter((f) => !f.paid && (f.due_date as string) < today)
    .reduce((s, f) => s + Number(f.amount ?? 0), 0)

  const pendingExpenses = expenses.filter((e) => e.status === 'pending_approval').length

  const approvedToday = expenses
    .filter((e) => e.status === 'approved' && (e.approved_at as string | null)?.slice(0, 10) === today)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const approvedThisMonth = expenses
    .filter((e) => e.status === 'approved' && (e.approved_at as string | null)?.slice(0, 7) === thisMonth)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="accountant" />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Accounting</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Finance overview
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">
            {/* Hero */}
            <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
              <div className="bg-[linear-gradient(135deg,#f4fbf6_0%,#ffffff_55%,#f7faf8_100%)] px-5 py-6 sm:px-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7a63]">
                  Finance command
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  What came in. What went out. What needs approval.
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Collected this month
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">
                      {fmt(collectedThisMonth)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Approved expenses this month
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-amber-700">
                      {fmt(approvedThisMonth)}
                    </div>
                  </div>
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      pendingExpenses > 0
                        ? 'border-red-200 bg-red-50/70'
                        : 'border-gray-200 bg-white/80'
                    }`}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Pending approvals
                    </div>
                    <div
                      className={`mt-2 text-2xl font-semibold tracking-tight ${
                        pendingExpenses > 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {pendingExpenses}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Today */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="text-sm font-semibold text-gray-900">Today</div>
                <div className="mt-1 text-sm text-gray-500">
                  A snapshot of money movement for today.
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                    <span className="text-sm text-gray-600">Fees collected today</span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(collectedToday)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                    <span className="text-sm text-gray-600">Expenses approved today</span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(approvedToday)}</span>
                  </div>
                  <div
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      pendingExpenses > 0
                        ? 'border-amber-100 bg-amber-50/70'
                        : 'border-gray-100 bg-[#fafcf9]'
                    }`}
                  >
                    <span className="text-sm text-gray-600">Pending approvals</span>
                    <span
                      className={`text-sm font-semibold ${
                        pendingExpenses > 0 ? 'text-amber-700' : 'text-gray-900'
                      }`}
                    >
                      {pendingExpenses}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3">
                    <span className="text-sm text-gray-600">Total outstanding fees</span>
                    <span className={`text-sm font-semibold ${outstanding > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                      {fmt(outstanding)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Quick links */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="text-sm font-semibold text-gray-900">Quick links</div>
                <div className="mt-1 text-sm text-gray-500">
                  Shortcuts for the finance tasks you use most.
                </div>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/accounting/expenses"
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-gray-200"
                  >
                    <span>Expenses</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                  <Link
                    href="/accounting/fees"
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-gray-200"
                  >
                    <span>Fee collection</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                  <Link
                    href="/accounting/outstanding"
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-gray-200"
                  >
                    <span>Outstanding fees</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                  <Link
                    href="/accounting/reports"
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#fafcf9] px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-gray-200"
                  >
                    <span>Reports</span>
                    <span className="text-gray-400">→</span>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
