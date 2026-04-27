import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import FeesClient, { type Fee } from './FeesClient'
import { CURRENT_TERM } from '@/lib/constants'
import { HelpButton } from '@/components/HelpButton'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'

export default async function FeesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''
  const effectiveRole = await resolveEffectiveRole(role)
  const schoolContext = await getSchoolContext(supabase, user.id)

  if (!role) redirect('/dashboard')

  if (role === 'teacher') redirect('/dashboard')
  if (role === 'superadmin' && !schoolContext?.schoolId) redirect('/superadmin')

  if (effectiveRole === 'admin') {
    const dataClient = role === 'superadmin' ? createAdminClient() : supabase
    let feesQuery = dataClient
      .from('fees')
      .select(
        'id, student_id, amount, due_date, paid, paid_at, term, created_at, student:students!inner(name, class_num, school_id)'
      )
      .order('created_at', { ascending: false })
      .limit(2000)

    let studentsQuery = dataClient
      .from('students')
      .select('id, name, class_num')
      .order('name')
      .limit(2000)

    if (schoolContext?.schoolId) {
      feesQuery = feesQuery.eq('student.school_id', schoolContext.schoolId)
      studentsQuery = studentsQuery.eq('school_id', schoolContext.schoolId)
    }

    const [feesRes, studentsRes] = await Promise.all([
      feesQuery,
      studentsQuery,
    ])

    return (
      <div className="uthaan-page-shell">
        <Sidebar
          email={user.email!}
          role="admin"
          isImpersonating={role === 'superadmin'}
        />
        <FeesClient
          initialFees={(feesRes.data as unknown as Fee[]) ?? []}
          students={studentsRes.data ?? []}
        />
      </div>
    )
  }

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
              <div className="text-sm font-medium text-gray-900 mb-1">
                No child linked to your account
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator to link your child.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, class_num, roll_no, is_active')
      .eq('id', link.student_id)
      .eq('is_active', true)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Student record not found
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: fees } = await supabase
      .from('fees')
      .select('id, student_id, amount, due_date, paid, paid_at, term, created_at')
      .eq('student_id', child.id)
      .order('due_date', { ascending: false })
      .limit(100)

    const feeList = fees ?? []
    const today = new Date().toISOString().split('T')[0]
    const totalDue = feeList
      .filter(f => !f.paid)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0)
    const totalPaid = feeList
      .filter(f => f.paid)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0)

    function statusOf(fee: (typeof feeList)[number]) {
      if (fee.paid) return 'paid' as const
      return fee.due_date < today ? 'overdue' as const : 'pending' as const
    }

    const STATUS_BADGE = {
      paid: 'bg-green-50 text-green-700 border-green-100',
      overdue: 'bg-red-50 text-red-600 border-red-100',
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    }

    const STATUS_LABEL = {
      paid: 'Paid',
      overdue: 'Overdue',
      pending: 'Pending',
    }

    const overdueFees = feeList.filter((fee) => statusOf(fee) === 'overdue')
    const pendingFees = feeList.filter((fee) => statusOf(fee) === 'pending')
    const nextDueFee = [...pendingFees]
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

    const currency = (amount: number) =>
      amount.toLocaleString('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
      })

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Fees</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
                Viewing as: {child.name}
              </span>
              <HelpButton pageKey="fees" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-5xl space-y-6">
              <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_10px_40px_rgba(16,24,40,0.06)]">
                <div className="bg-[linear-gradient(135deg,#f4fbf6_0%,#ffffff_55%,#f7faf8_100%)] px-5 py-6 sm:px-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d7a63]">
                        Fee overview
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2rem]">
                          {child.name}
                        </h2>
                        <span className="inline-flex items-center rounded-full border border-[#6fcf6f]/25 bg-[#6fcf6f]/10 px-3 py-1 text-xs font-medium text-[#1a7a4a]">
                          Class {child.class_num}
                          {child.roll_no ? ` · Roll ${child.roll_no}` : ''}
                        </span>
                      </div>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 sm:text-[15px]">
                        Review fee status, recent payments, and the next step for settling any outstanding balances.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Outstanding
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                          {currency(totalDue)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Paid
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">
                          {currency(totalPaid)}
                        </div>
                      </div>
                      <div className={`rounded-2xl border px-4 py-4 ${overdueFees.length > 0 ? 'border-red-200 bg-red-50/70' : 'border-white/70 bg-white/80'}`}>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                          Status
                        </div>
                        <div className={`mt-2 text-2xl font-semibold tracking-tight ${overdueFees.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {overdueFees.length > 0 ? `${overdueFees.length} overdue` : 'On track'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.9fr]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <div className="text-sm font-semibold text-gray-900">Fee summary</div>
                  <div className="mt-1 text-sm text-gray-500">
                    A quick view of outstanding balances, paid amounts, and what may need attention next.
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Outstanding amount
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                        {currency(totalDue)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {pendingFees.length + overdueFees.length} unpaid record{pendingFees.length + overdueFees.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Paid amount
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-green-700">
                        {currency(totalPaid)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {feeList.filter((fee) => fee.paid).length} paid record{feeList.filter((fee) => fee.paid).length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Next due date
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                        {nextDueFee
                          ? new Date(nextDueFee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {nextDueFee ? nextDueFee.term : 'No upcoming unpaid fee found'}
                      </div>
                    </div>

                    <div className={`rounded-2xl border px-4 py-4 ${overdueFees.length > 0 ? 'border-red-200 bg-red-50/70' : 'border-gray-200 bg-[#fafcf9]'}`}>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Overdue items
                      </div>
                      <div className={`mt-2 text-xl font-semibold tracking-tight ${overdueFees.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {overdueFees.length}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {overdueFees.length > 0 ? 'Please contact the school office for the next step.' : 'No overdue fees at the moment'}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <div className="text-sm font-semibold text-gray-900">Payment instructions</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Use the school’s approved payment method to settle balances.
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-[#fafcf9] px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        Next step
                      </div>
                      <div className="mt-1 text-sm leading-6 text-gray-500">
                        Please contact the school office or pay through the school&apos;s approved payment method. Payment confirmation will appear here once the office records it.
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Online payments
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Online payment updates will appear here when your school enables them.
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {feeList.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
                  No fees recorded
                </div>
              ) : (
                <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-900">Fee history</div>
                    <div className="mt-1 text-sm text-gray-500">
                      Review each recorded fee term, due date, amount, and payment status.
                    </div>
                  </div>
                  {feeList.map((fee, i) => {
                    const status = statusOf(fee)

                    return (
                      <div
                        key={fee.id}
                        className={`px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                          i < feeList.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {fee.term}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                            <span>
                              Due{' '}
                            {new Date(fee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            </span>
                            {fee.paid && fee.paid_at ? (
                              <span>
                                Paid{' '}
                                {new Date(fee.paid_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {currency(fee.amount ?? 0)}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    const studentId = roleData?.student_id

    if (!studentId) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="student" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Contact your school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', studentId)
      .eq('is_active', true)
      .single()

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="student" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Contact your school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: fees } = await supabase
      .from('fees')
      .select('id, student_id, amount, due_date, paid, paid_at, term, created_at')
      .eq('student_id', student.id)
      .order('due_date', { ascending: false })
      .limit(100)

    const feeList = fees ?? []
    const totalDue = feeList
      .filter(f => !f.paid)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0)
    const totalPaid = feeList
      .filter(f => f.paid)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0)

    function statusOf(fee: (typeof feeList)[number]) {
      if (fee.paid) return 'paid' as const
      const today = new Date().toISOString().split('T')[0]
      return fee.due_date < today ? 'overdue' as const : 'pending' as const
    }

    const STATUS_BADGE = {
      paid: 'bg-green-50 text-green-700 border-green-100',
      overdue: 'bg-red-50 text-red-600 border-red-100',
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    }

    const STATUS_LABEL = {
      paid: 'Paid',
      overdue: 'Overdue',
      pending: 'Pending',
    }

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="student" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Fees</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
                {CURRENT_TERM}
              </span>
              <HelpButton pageKey="fees" />
            </div>
          </header>

          <main className="uthaan-page-content">
            <div className="max-w-xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    Outstanding
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {totalDue.toLocaleString('en-PK', {
                      style: 'currency',
                      currency: 'PKR',
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                    Paid
                  </div>
                  <div className="text-2xl font-semibold text-green-700">
                    {totalPaid.toLocaleString('en-PK', {
                      style: 'currency',
                      currency: 'PKR',
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              {feeList.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
                  No fees recorded
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {feeList.map((fee, i) => {
                    const status = statusOf(fee)

                    return (
                      <div
                        key={fee.id}
                        className={`px-5 py-4 flex items-center justify-between gap-3 ${
                          i < feeList.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {fee.term}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Due{' '}
                            {new Date(fee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {fee.paid && fee.paid_at && (
                              <>
                                {' '}
                                · Paid{' '}
                                {new Date(fee.paid_at).toLocaleDateString(
                                  'en-GB',
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                  }
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-900">
                            {fee.amount?.toLocaleString('en-PK', {
                              style: 'currency',
                              currency: 'PKR',
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  redirect('/dashboard')
}
