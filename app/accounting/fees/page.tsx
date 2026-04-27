import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AccountingFeesClient, { type FeeRow, type PaymentRow } from './AccountingFeesClient'

export default async function AccountingFeesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const schoolId = roleData?.school_id as string | null

  if (role !== 'accountant' && role !== 'admin') redirect('/dashboard')
  if (!schoolId) redirect('/dashboard')

  // Admin is served by /fees (FeesClient). Accountant uses this dedicated route.
  // Both roles are allowed here so admin can also use this view if needed.

  const [feesRes, studentsRes, paymentsRes] = await Promise.all([
    supabase
      .from('fees')
      .select('id, student_id, amount, due_date, paid, paid_at, term, student:students!inner(name, class_num)')
      .order('due_date', { ascending: false })
      .limit(2000),
    supabase
      .from('students')
      .select('id, name, class_num')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name'),
    // Deliberately excludes receipt_proof_path, receipt_filename, receipt_mime_type
    // Those are only accessible via the getProofSignedUrl server action
    supabase
      .from('fee_payments')
      .select('id, fee_id, amount_paid, payment_date, payment_method, receipt_option, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5000),
  ])

  const fees = (feesRes.data ?? []) as unknown as FeeRow[]
  const students = studentsRes.data ?? []
  const payments = (paymentsRes.data ?? []) as PaymentRow[]

  const classes = Array.from(
    new Set(students.filter((s) => s.class_num != null).map((s) => s.class_num as number)),
  ).sort((a, b) => a - b)

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role={role === 'admin' ? 'admin' : 'accountant'} />
      <AccountingFeesClient
        initialFees={fees}
        initialPayments={payments}
        students={students}
        classes={classes}
        schoolId={schoolId}
      />
    </div>
  )
}
