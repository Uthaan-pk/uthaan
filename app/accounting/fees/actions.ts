'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ACCOUNTING_ROLES = ['accountant', 'admin'] as const
type AccountingRole = (typeof ACCOUNTING_ROLES)[number]

type Ctx = { userId: string; schoolId: string; role: AccountingRole }

async function getCtx(): Promise<Ctx | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (
    !data?.school_id ||
    !(ACCOUNTING_ROLES as readonly string[]).includes(data.role)
  )
    return null

  return { userId: user.id, schoolId: data.school_id, role: data.role as AccountingRole }
}

// ── Create individual fee ────────────────────────────────────────────────────

export async function createFee(payload: {
  studentId: string
  amount: number
  dueDate: string
  term: string
}): Promise<{ error?: string; success?: true }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Forbidden.' }

  const { studentId, amount, dueDate, term } = payload

  if (!studentId) return { error: 'Student is required.' }
  if (isNaN(amount) || amount <= 0) return { error: 'Enter a valid amount.' }
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: 'Due date is required.' }
  if (!term.trim()) return { error: 'Term is required.' }

  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', ctx.schoolId)
    .eq('is_active', true)
    .single()

  if (!student) return { error: 'Student not found in your school.' }

  const { error } = await supabase.from('fees').insert({
    student_id: studentId,
    amount,
    due_date: dueDate,
    term: term.trim(),
  })

  if (error) return { error: error.message }

  revalidatePath('/accounting/fees')
  revalidatePath('/accounting')
  return { success: true }
}

// ── Preview bulk fee count ───────────────────────────────────────────────────

export async function previewBulkFees(payload: {
  scope: 'class' | 'school'
  classNum?: number
  term: string
}): Promise<{ error?: string; eligible?: number; existing?: number }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Forbidden.' }

  const { scope, classNum, term } = payload
  if (!term.trim()) return { error: 'Term is required.' }
  if (scope === 'class' && !classNum) return { error: 'Class is required.' }

  const supabase = await createClient()

  let q = supabase
    .from('students')
    .select('id')
    .eq('school_id', ctx.schoolId)
    .eq('is_active', true)

  if (scope === 'class') q = q.eq('class_num', classNum!)

  const { data: students, error: sErr } = await q
  if (sErr) return { error: sErr.message }
  if (!students || students.length === 0) return { eligible: 0, existing: 0 }

  const studentIds = students.map((s) => s.id)

  const { data: existing } = await supabase
    .from('fees')
    .select('student_id')
    .in('student_id', studentIds)
    .eq('term', term.trim())

  const existingCount = new Set((existing ?? []).map((f) => f.student_id)).size

  return { eligible: studentIds.length - existingCount, existing: existingCount }
}

// ── Create bulk fees (class-wide or school-wide) ─────────────────────────────

export async function createBulkFees(payload: {
  scope: 'class' | 'school'
  classNum?: number
  amount: number
  dueDate: string
  term: string
}): Promise<{ error?: string; created?: number; skipped?: number }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Forbidden.' }

  const { scope, classNum, amount, dueDate, term } = payload

  if (isNaN(amount) || amount <= 0) return { error: 'Invalid amount.' }
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: 'Invalid due date.' }
  if (!term.trim()) return { error: 'Term is required.' }
  if (scope === 'class' && !classNum) return { error: 'Class is required.' }

  const supabase = await createClient()

  let q = supabase
    .from('students')
    .select('id')
    .eq('school_id', ctx.schoolId)
    .eq('is_active', true)

  if (scope === 'class') q = q.eq('class_num', classNum!)

  const { data: students, error: sErr } = await q
  if (sErr) return { error: sErr.message }
  if (!students || students.length === 0) return { created: 0, skipped: 0 }

  const studentIds = students.map((s) => s.id)

  const { data: existing } = await supabase
    .from('fees')
    .select('student_id')
    .in('student_id', studentIds)
    .eq('term', term.trim())

  const existingSet = new Set((existing ?? []).map((f) => f.student_id))
  const toCreate = studentIds.filter((id) => !existingSet.has(id))

  if (toCreate.length === 0) return { created: 0, skipped: studentIds.length }

  const rows = toCreate.map((student_id) => ({
    student_id,
    amount,
    due_date: dueDate,
    term: term.trim(),
  }))

  const { error } = await supabase.from('fees').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/accounting/fees')
  revalidatePath('/accounting')
  return { created: toCreate.length, skipped: existingSet.size }
}

// ── Record payment ────────────────────────────────────────────────────────────
// File is uploaded client-side directly to Supabase Storage.
// Only metadata is sent here; server reconstructs the storage path.

export async function recordPayment(payload: {
  feeId: string
  amountPaid: number
  paymentDate: string
  paymentMethod: string
  paymentNote?: string
  receiptOption: string
  feePaymentId?: string
  receiptFilename?: string
  receiptMimeType?: string
}): Promise<{ error?: string; success?: true }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Forbidden.' }

  const {
    feeId,
    amountPaid,
    paymentDate,
    paymentMethod,
    paymentNote,
    receiptOption,
    feePaymentId,
    receiptFilename,
    receiptMimeType,
  } = payload

  if (!feeId) return { error: 'Fee ID is required.' }
  if (isNaN(amountPaid) || amountPaid <= 0) return { error: 'Enter a valid amount.' }
  if (!paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))
    return { error: 'Payment date is required.' }
  if (!['cash', 'bank_transfer', 'cheque', 'other'].includes(paymentMethod))
    return { error: 'Invalid payment method.' }
  if (!['uploaded_proof', 'digital_receipt'].includes(receiptOption))
    return { error: 'Invalid receipt option.' }

  const supabase = await createClient()

  // Verify fee belongs to this school via student → school_id
  const { data: fee } = await supabase
    .from('fees')
    .select('id, student_id, amount, paid')
    .eq('id', feeId)
    .single()

  if (!fee) return { error: 'Fee not found.' }

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', fee.student_id)
    .eq('school_id', ctx.schoolId)
    .single()

  if (!student) return { error: 'Fee does not belong to your school.' }

  // Build storage path for uploaded proof — server constructs this, never trusts client path
  let receiptProofPath: string | null = null

  if (receiptOption === 'uploaded_proof') {
    if (!feePaymentId || !receiptFilename || !receiptMimeType)
      return { error: 'Receipt file information is missing.' }

    const ext = receiptFilename.split('.').pop()?.toLowerCase() ?? 'bin'
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
    if (!allowed.includes(ext)) return { error: 'Unsupported file type.' }

    receiptProofPath = `${ctx.schoolId}/${feePaymentId}/${feePaymentId}.${ext}`

    // Verify the upload actually exists in storage before recording
    const admin = createAdminClient()
    const { data: listed } = await admin.storage
      .from('fee-receipts')
      .list(`${ctx.schoolId}/${feePaymentId}`)

    if (!listed || listed.length === 0)
      return { error: 'Receipt file not found in storage. Please upload it again.' }
  }

  const paymentId = feePaymentId ?? crypto.randomUUID()

  const { error: payErr } = await supabase.from('fee_payments').insert({
    id: paymentId,
    school_id: ctx.schoolId,
    fee_id: feeId,
    student_id: fee.student_id,
    amount_paid: amountPaid,
    payment_date: paymentDate,
    payment_method: paymentMethod,
    payment_note: paymentNote?.trim() || null,
    receipt_option: receiptOption,
    receipt_proof_path: receiptProofPath,
    receipt_filename: receiptOption === 'uploaded_proof' ? receiptFilename ?? null : null,
    receipt_mime_type: receiptOption === 'uploaded_proof' ? receiptMimeType ?? null : null,
    recorded_by: ctx.userId,
  })

  if (payErr) return { error: payErr.message }

  // Mark fee as paid if total payments cover the fee amount
  const { data: allPayments } = await supabase
    .from('fee_payments')
    .select('amount_paid')
    .eq('fee_id', feeId)

  const totalPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount_paid), 0)

  if (totalPaid >= Number(fee.amount)) {
    await supabase
      .from('fees')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', feeId)
  }

  revalidatePath('/accounting/fees')
  revalidatePath('/accounting')
  return { success: true }
}

// ── Signed URL for uploaded proof (accountant/admin only) ────────────────────

export async function getProofSignedUrl(
  feePaymentId: string,
): Promise<{ url?: string; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Forbidden.' }

  const supabase = await createClient()

  const { data: payment } = await supabase
    .from('fee_payments')
    .select('receipt_proof_path, school_id, receipt_option')
    .eq('id', feePaymentId)
    .single()

  if (!payment || payment.receipt_option !== 'uploaded_proof' || !payment.receipt_proof_path)
    return { error: 'No uploaded proof found.' }

  if (payment.school_id !== ctx.schoolId) return { error: 'Forbidden.' }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('fee-receipts')
    .createSignedUrl(payment.receipt_proof_path, 3600)

  if (error || !data) return { error: error?.message ?? 'Could not generate link.' }
  return { url: data.signedUrl }
}
