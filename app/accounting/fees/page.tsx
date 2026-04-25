import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

type FeeRow = {
  id: string
  student_id: string
  amount: number
  due_date: string
  paid: boolean
  paid_at: string | null
  term: string
}

type StudentRow = {
  id: string
  name: string
  class_num: number | null
  roll_no: string | null
}

export default async function AccountingFeesPage() {
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

  const [feesRes, studentsRes] = await Promise.all([
    supabase
      .from('fees')
      .select('id, student_id, amount, due_date, paid, paid_at, term')
      .order('due_date', { ascending: false })
      .limit(2000),
    supabase
      .from('students')
      .select('id, name, class_num, roll_no')
      .eq('is_active', true)
      .order('name'),
  ])

  const fees = (feesRes.data ?? []) as FeeRow[]
  const students = (studentsRes.data ?? []) as StudentRow[]
  const studentMap = new Map(students.map((s) => [s.id, s]))

  const paidFees = fees.filter((f) => f.paid)
  const collectedToday = paidFees
    .filter((f) => f.paid_at?.slice(0, 10) === today)
    .reduce((s, f) => s + Number(f.amount), 0)
  const collectedThisMonth = paidFees
    .filter((f) => f.paid_at?.slice(0, 7) === thisMonth)
    .reduce((s, f) => s + Number(f.amount), 0)
  const totalCollected = paidFees.reduce((s, f) => s + Number(f.amount), 0)

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  const STATUS_BADGE = {
    paid: 'bg-green-50 text-green-700 border-green-100',
    overdue: 'bg-red-50 text-red-600 border-red-100',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  }
  const STATUS_LABEL = { paid: 'Paid', overdue: 'Overdue', pending: 'Pending' }

  function statusOf(fee: FeeRow) {
    if (fee.paid) return 'paid' as const
    return fee.due_date < today ? ('overdue' as const) : ('pending' as const)
  }

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="accountant" />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Fee Collection</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Read-only view
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Collected today
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">
                  {fmt(collectedToday)}
                </div>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Collected this month
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">
                  {fmt(collectedThisMonth)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Total collected (all time)
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  {fmt(totalCollected)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
              Fee payment recording is managed by the school admin. Contact the admin to mark a fee as paid.
            </div>

            {/* Fee list */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900">All fee records</div>
                <div className="mt-1 text-sm text-gray-500">
                  {fees.length} record{fees.length === 1 ? '' : 's'} across all students.
                </div>
              </div>

              {fees.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-400">
                  No fee records found.
                </div>
              ) : (
                fees.map((fee, i) => {
                  const status = statusOf(fee)
                  const student = studentMap.get(fee.student_id)

                  return (
                    <div
                      key={fee.id}
                      className={`px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                        i < fees.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {student?.name ?? 'Unknown student'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                          {student?.class_num && <span>Class {student.class_num}</span>}
                          {student?.roll_no && <span>Roll {student.roll_no}</span>}
                          <span>{fee.term}</span>
                          <span>
                            Due{' '}
                            {new Date(fee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {fee.paid && fee.paid_at && (
                            <span>
                              Paid{' '}
                              {new Date(fee.paid_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-gray-900">
                          {fmt(Number(fee.amount))}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
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
