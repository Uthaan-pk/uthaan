import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import FeesClient, { type Fee } from './FeesClient'
import { CURRENT_TERM } from '@/lib/constants'
import { HelpButton } from '@/components/HelpButton'

export default async function FeesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''

  if (!role) redirect('/dashboard')

  if (role === 'teacher') redirect('/dashboard')

  if (role === 'admin') {
    const [feesRes, studentsRes] = await Promise.all([
      supabase
        .from('fees')
        .select(
          'id, student_id, amount, due_date, paid, paid_at, term, created_at, student:students!inner(name, class_num)'
        )
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('students')
        .select('id, name, class_num')
        .order('name')
        .limit(2000),
    ])

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="admin" />
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
      .select('id, name, class_num, is_active')
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
