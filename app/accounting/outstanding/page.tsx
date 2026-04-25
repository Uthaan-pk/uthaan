import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

type FeeRow = {
  id: string
  student_id: string
  amount: number
  due_date: string
  paid: boolean
  term: string
}

type StudentRow = {
  id: string
  name: string
  class_num: number | null
  roll_no: string | null
}

export default async function AccountingOutstandingPage() {
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

  const [feesRes, studentsRes] = await Promise.all([
    supabase
      .from('fees')
      .select('id, student_id, amount, due_date, paid, term')
      .eq('paid', false)
      .order('due_date', { ascending: true })
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

  const overdueFees = fees.filter((f) => f.due_date < today)
  const pendingFees = fees.filter((f) => f.due_date >= today)

  const totalOverdue = overdueFees.reduce((s, f) => s + Number(f.amount), 0)
  const totalPending = pendingFees.reduce((s, f) => s + Number(f.amount), 0)
  const totalOutstanding = totalOverdue + totalPending

  // Group by student
  const byStudent = new Map<string, { name: string; class_num: number | null; roll_no: string | null; overdue: number; pending: number; fees: FeeRow[] }>()
  fees.forEach((fee) => {
    const s = studentMap.get(fee.student_id)
    if (!byStudent.has(fee.student_id)) {
      byStudent.set(fee.student_id, {
        name: s?.name ?? 'Unknown',
        class_num: s?.class_num ?? null,
        roll_no: s?.roll_no ?? null,
        overdue: 0,
        pending: 0,
        fees: [],
      })
    }
    const entry = byStudent.get(fee.student_id)!
    if (fee.due_date < today) entry.overdue += Number(fee.amount)
    else entry.pending += Number(fee.amount)
    entry.fees.push(fee)
  })

  const studentRows = Array.from(byStudent.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.overdue - a.overdue)

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role="accountant" />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header">
          <h1 className="text-sm font-semibold text-gray-900">Outstanding Fees</h1>
          <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
            Unpaid balances
          </span>
        </header>

        <main className="uthaan-page-content">
          <div className="max-w-5xl space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  totalOverdue > 0
                    ? 'border-red-200 bg-red-50/70'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Overdue
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold tracking-tight ${
                    totalOverdue > 0 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {fmt(totalOverdue)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {overdueFees.length} record{overdueFees.length === 1 ? '' : 's'} past due date
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Pending (not yet due)
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-amber-700">
                  {fmt(totalPending)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {pendingFees.length} record{pendingFees.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Total outstanding
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                  {fmt(totalOutstanding)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {studentRows.length} student{studentRows.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {/* Per-student breakdown */}
            <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900">By student</div>
                <div className="mt-1 text-sm text-gray-500">
                  Students with unpaid fee balances, sorted by overdue amount.
                </div>
              </div>

              {studentRows.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-400">
                  No outstanding fees. All balances are settled.
                </div>
              ) : (
                studentRows.map((student, i) => (
                  <div
                    key={student.id}
                    className={`px-5 py-4 ${
                      i < studentRows.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="mt-0.5 flex gap-3 text-[11px] text-gray-500">
                          {student.class_num && <span>Class {student.class_num}</span>}
                          {student.roll_no && <span>Roll {student.roll_no}</span>}
                          <span>{student.fees.length} unpaid record{student.fees.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {student.overdue > 0 && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                            {fmt(student.overdue)} overdue
                          </span>
                        )}
                        {student.pending > 0 && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            {fmt(student.pending)} upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
