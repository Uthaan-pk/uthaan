'use client'

import { useRef, useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import {
  createFee,
  createBulkFees,
  previewBulkFees,
  recordPayment,
  getProofSignedUrl,
} from './actions'

// ── Types ────────────────────────────────────────────────────────────────────

export type FeeRow = {
  id: string
  student_id: string
  amount: number
  due_date: string
  paid: boolean
  paid_at: string | null
  term: string
  student: { name: string; class_num: number | null } | null
}

export type PaymentRow = {
  id: string
  fee_id: string
  amount_paid: number
  payment_date: string
  payment_method: string
  receipt_option: string
  created_at: string
}

type StudentRow = { id: string; name: string; class_num: number | null }

// ── Helpers ───────────────────────────────────────────────────────────────────

type Status = 'paid' | 'overdue' | 'pending'

function statusOf(fee: FeeRow): Status {
  if (fee.paid) return 'paid'
  const today = new Date().toISOString().split('T')[0]
  return fee.due_date < today ? 'overdue' : 'pending'
}

const STATUS_BADGE: Record<Status, string> = {
  paid: 'bg-green-50 text-green-700 border-green-100',
  overdue: 'bg-red-50 text-red-600 border-red-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
}
const STATUS_LABEL: Record<Status, string> = { paid: 'Paid', overdue: 'Overdue', pending: 'Pending' }

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  other: 'Other',
}

function pkr(n: number) {
  return `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'
const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1'

const PAGE_SIZE = 50
const today = new Date().toISOString().split('T')[0]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AccountingFeesClient({
  initialFees,
  initialPayments,
  students,
  classes,
  schoolId,
}: {
  initialFees: FeeRow[]
  initialPayments: PaymentRow[]
  students: StudentRow[]
  classes: number[]
  schoolId: string
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isPending, startTransition] = useTransition()

  // payments by fee_id for quick lookup
  const paymentsMap = useMemo(() => {
    const m = new Map<string, PaymentRow[]>()
    for (const p of initialPayments) {
      if (!m.has(p.fee_id)) m.set(p.fee_id, [])
      m.get(p.fee_id)!.push(p)
    }
    return m
  }, [initialPayments])

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterClass, setFilterClass] = useState('all')
  const [filterTerm, setFilterTerm] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)

  const terms = useMemo(() => {
    const s = new Set<string>()
    initialFees.forEach((f) => s.add(f.term))
    return Array.from(s).sort()
  }, [initialFees])

  const filtered = useMemo(() => {
    setPage(1)
    return initialFees.filter((f) => {
      if (filterClass !== 'all' && String(f.student?.class_num) !== filterClass) return false
      if (filterTerm !== 'all' && f.term !== filterTerm) return false
      if (filterStatus !== 'all') {
        const s = statusOf(f)
        if (filterStatus === 'paid' && s !== 'paid') return false
        if (filterStatus === 'unpaid' && s === 'paid') return false
        if (filterStatus === 'overdue' && s !== 'overdue') return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFees, filterClass, filterTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalCollected = initialFees.filter((f) => f.paid).reduce((s, f) => s + Number(f.amount), 0)
  const totalOutstanding = initialFees
    .filter((f) => !f.paid)
    .reduce((s, f) => s + Number(f.amount), 0)

  // ── Create fee modal ────────────────────────────────────────────────────────
  type CreateTab = 'individual' | 'class' | 'school'
  type BulkStep = 'form' | 'preview'

  const [showCreate, setShowCreate] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTab>('individual')

  // Individual form
  const [indivForm, setIndivForm] = useState({
    student_id: '',
    amount: '',
    due_date: '',
    term: '',
  })

  // Bulk form (class/school)
  const [bulkForm, setBulkForm] = useState({
    class_num: '',
    amount: '',
    due_date: '',
    term: '',
  })
  const [bulkStep, setBulkStep] = useState<BulkStep>('form')
  const [bulkPreview, setBulkPreview] = useState<{ eligible: number; existing: number } | null>(
    null,
  )
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null)

  function resetCreate() {
    setCreateTab('individual')
    setIndivForm({ student_id: '', amount: '', due_date: '', term: '' })
    setBulkForm({ class_num: '', amount: '', due_date: '', term: '' })
    setBulkStep('form')
    setBulkPreview(null)
    setBulkResult(null)
  }

  function handleSubmitIndividual() {
    startTransition(async () => {
      const result = await createFee({
        studentId: indivForm.student_id,
        amount: parseFloat(indivForm.amount),
        dueDate: indivForm.due_date,
        term: indivForm.term,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Fee created.')
      setShowCreate(false)
      resetCreate()
      router.refresh()
    })
  }

  function handleBulkPreview() {
    startTransition(async () => {
      const result = await previewBulkFees({
        scope: createTab as 'class' | 'school',
        classNum: createTab === 'class' ? parseInt(bulkForm.class_num) : undefined,
        term: bulkForm.term,
      })
      if (result.error) { toast.error(result.error); return }
      setBulkPreview({ eligible: result.eligible ?? 0, existing: result.existing ?? 0 })
      setBulkStep('preview')
    })
  }

  function handleBulkCreate() {
    startTransition(async () => {
      const result = await createBulkFees({
        scope: createTab as 'class' | 'school',
        classNum: createTab === 'class' ? parseInt(bulkForm.class_num) : undefined,
        amount: parseFloat(bulkForm.amount),
        dueDate: bulkForm.due_date,
        term: bulkForm.term,
      })
      if (result.error) { toast.error(result.error); return }
      setBulkResult({ created: result.created ?? 0, skipped: result.skipped ?? 0 })
      toast.success(`${result.created} fee${result.created === 1 ? '' : 's'} created.`)
      router.refresh()
    })
  }

  // ── Record payment modal ────────────────────────────────────────────────────
  const [payFee, setPayFee] = useState<FeeRow | null>(null)
  const [payForm, setPayForm] = useState({
    amount_paid: '',
    payment_date: today,
    payment_method: 'cash',
    payment_note: '',
    receipt_option: 'digital_receipt',
  })
  const [payFile, setPayFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function openPayModal(fee: FeeRow) {
    setPayFee(fee)
    setPayForm({
      amount_paid: String(fee.amount),
      payment_date: today,
      payment_method: 'cash',
      payment_note: '',
      receipt_option: 'digital_receipt',
    })
    setPayFile(null)
  }

  function closePayModal() {
    setPayFee(null)
    setPayFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRecordPayment() {
    if (!payFee) return
    const amountPaid = parseFloat(payForm.amount_paid)
    if (isNaN(amountPaid) || amountPaid <= 0) { toast.error('Enter a valid amount.'); return }

    let feePaymentId: string | undefined
    let receiptFilename: string | undefined
    let receiptMimeType: string | undefined

    if (payForm.receipt_option === 'uploaded_proof') {
      if (!payFile || payFile.size === 0) { toast.error('Please select a file to upload.'); return }
      if (payFile.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB.'); return }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(payFile.type)) {
        toast.error('Unsupported file type. Use JPEG, PNG, WebP, or PDF.')
        return
      }

      feePaymentId = crypto.randomUUID()
      receiptFilename = payFile.name
      receiptMimeType = payFile.type
      const ext = receiptFilename.split('.').pop()?.toLowerCase() ?? 'bin'
      const path = `${schoolId}/${feePaymentId}/${feePaymentId}.${ext}`

      setUploading(true)
      const { error: uploadErr } = await supabase.storage
        .from('fee-receipts')
        .upload(path, payFile, { contentType: payFile.type, upsert: false })
      setUploading(false)

      if (uploadErr) { toast.error(`Upload failed: ${uploadErr.message}`); return }
    }

    startTransition(async () => {
      const result = await recordPayment({
        feeId: payFee.id,
        amountPaid,
        paymentDate: payForm.payment_date,
        paymentMethod: payForm.payment_method,
        paymentNote: payForm.payment_note || undefined,
        receiptOption: payForm.receipt_option,
        feePaymentId,
        receiptFilename,
        receiptMimeType,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Payment recorded.')
      closePayModal()
      router.refresh()
    })
  }

  // ── Proof signed URL ────────────────────────────────────────────────────────
  const [proofLoading, setProofLoading] = useState<string | null>(null)

  async function handleViewProof(paymentId: string) {
    setProofLoading(paymentId)
    const result = await getProofSignedUrl(paymentId)
    setProofLoading(null)
    if (result.error || !result.url) { toast.error(result.error ?? 'Could not load proof.'); return }
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const isActing = isPending || uploading

  return (
    <div className="uthaan-page-main">
      <header className="uthaan-page-header">
        <h1 className="text-sm font-semibold text-gray-900">Fee Collection</h1>
        <button
          onClick={() => { resetCreate(); setShowCreate(true) }}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors min-h-[36px]"
        >
          + Create fee
        </button>
      </header>

      <main className="uthaan-page-content space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Total records</div>
            <div className="text-lg font-bold text-gray-900">{initialFees.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-green-100 px-4 py-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Collected</div>
            <div className="text-lg font-bold text-green-700">{pkr(totalCollected)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Outstanding</div>
            <div className={`text-lg font-bold ${totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {pkr(totalOutstanding)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap gap-2">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c} value={String(c)}>Class {c}</option>
            ))}
          </select>
          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All terms</option>
            {terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
          {filtered.length !== initialFees.length && (
            <span className="self-center text-xs text-gray-400">
              {filtered.length} of {initialFees.length}
            </span>
          )}
        </div>

        {/* Fee list */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              {initialFees.length === 0 ? (
                <>
                  <div className="text-sm font-medium text-gray-900 mb-1">No fees recorded yet</div>
                  <div className="text-xs text-gray-400 mb-4">Create a fee to get started.</div>
                  <button
                    onClick={() => { resetCreate(); setShowCreate(true) }}
                    className="inline-flex items-center gap-1.5 bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-[#243d24] transition-colors"
                  >
                    + Create first fee
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-400">No fees match these filters.</div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Student', 'Class', 'Term', 'Amount', 'Due Date', 'Status', 'Last payment', 'Actions'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((fee) => {
                      const status = statusOf(fee)
                      const payments = paymentsMap.get(fee.id) ?? []
                      const lastPay = payments[0] ?? null
                      return (
                        <tr
                          key={fee.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                            {fee.student?.name ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                            {fee.student?.class_num != null ? `Class ${fee.student.class_num}` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{fee.term}</td>
                          <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                            {pkr(Number(fee.amount))}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                            {new Date(fee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-gray-500 whitespace-nowrap">
                            {lastPay ? (
                              <span>
                                {pkr(Number(lastPay.amount_paid))} · {METHOD_LABEL[lastPay.payment_method] ?? lastPay.payment_method} ·{' '}
                                {new Date(lastPay.payment_date).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {!fee.paid && (
                                <button
                                  onClick={() => openPayModal(fee)}
                                  className="text-[11px] text-[#1a2e1a] hover:text-[#6fcf6f] border border-gray-200 hover:border-[#6fcf6f]/40 rounded px-2 py-1 transition-colors whitespace-nowrap"
                                >
                                  Record payment
                                </button>
                              )}
                              <a
                                href={`/fees/receipt/${fee.student_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-gray-400 hover:text-[#1a2e1a] border border-gray-200 hover:border-gray-300 rounded px-2 py-1 transition-colors whitespace-nowrap"
                              >
                                Receipt
                              </a>
                              {payments.some((p) => p.receipt_option === 'uploaded_proof') && (
                                <button
                                  onClick={() => {
                                    const proofPay = payments.find(
                                      (p) => p.receipt_option === 'uploaded_proof',
                                    )
                                    if (proofPay) handleViewProof(proofPay.id)
                                  }}
                                  disabled={proofLoading != null}
                                  className="text-[11px] text-gray-400 hover:text-[#1a2e1a] border border-gray-200 hover:border-gray-300 rounded px-2 py-1 transition-colors whitespace-nowrap disabled:opacity-50"
                                >
                                  {proofLoading ? '…' : 'View proof'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-50">
                {pageRows.map((fee) => {
                  const status = statusOf(fee)
                  const payments = paymentsMap.get(fee.id) ?? []
                  const lastPay = payments[0] ?? null
                  return (
                    <div key={fee.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {fee.student?.name ?? '—'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {fee.student?.class_num != null ? `Class ${fee.student.class_num}` : ''}{' '}
                            · {fee.term}
                          </div>
                        </div>
                        <span
                          className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <div className="text-base font-semibold text-gray-900 mb-0.5">
                        {pkr(Number(fee.amount))}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        Due{' '}
                        {new Date(fee.due_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {lastPay && (
                          <>
                            {' '}· Last paid{' '}
                            {new Date(lastPay.payment_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!fee.paid && (
                          <button
                            onClick={() => openPayModal(fee)}
                            className="text-xs font-medium bg-[#1a2e1a] text-[#6fcf6f] rounded-lg px-3 py-2 min-h-[40px] hover:bg-[#243d24] transition-colors"
                          >
                            Record payment
                          </button>
                        )}
                        <a
                          href={`/fees/receipt/${fee.student_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 min-h-[40px] flex items-center hover:text-[#1a2e1a] hover:border-gray-300 transition-colors"
                        >
                          Receipt
                        </a>
                        {payments.some((p) => p.receipt_option === 'uploaded_proof') && (
                          <button
                            onClick={() => {
                              const proofPay = payments.find(
                                (p) => p.receipt_option === 'uploaded_proof',
                              )
                              if (proofPay) handleViewProof(proofPay.id)
                            }}
                            disabled={proofLoading != null}
                            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 min-h-[40px] flex items-center hover:text-[#1a2e1a] hover:border-gray-300 transition-colors disabled:opacity-50"
                          >
                            {proofLoading ? '…' : 'View proof'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-white rounded-b-xl">
              <span className="text-xs text-gray-400">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}{' '}
                of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 text-xs text-gray-500">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Create fee modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl flex flex-col max-h-[90dvh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Create fee</h2>
              <button
                onClick={() => { setShowCreate(false); resetCreate() }}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-1 flex-shrink-0">
              {(['individual', 'class', 'school'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setCreateTab(tab); setBulkStep('form'); setBulkPreview(null); setBulkResult(null) }}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    createTab === tab
                      ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'individual' ? 'Individual' : tab === 'class' ? 'Class-wide' : 'School-wide'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {createTab === 'individual' && (
                <>
                  <div>
                    <label className={labelCls}>Student</label>
                    <select
                      value={indivForm.student_id}
                      onChange={(e) => setIndivForm((f) => ({ ...f, student_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Select student…</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.class_num != null ? ` — Class ${s.class_num}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Amount (PKR)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="5000"
                        value={indivForm.amount}
                        onChange={(e) => setIndivForm((f) => ({ ...f, amount: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Due Date</label>
                      <input
                        type="date"
                        value={indivForm.due_date}
                        onChange={(e) => setIndivForm((f) => ({ ...f, due_date: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Term / Fee type</label>
                    <input
                      type="text"
                      placeholder="e.g. Spring Term 2026"
                      value={indivForm.term}
                      onChange={(e) => setIndivForm((f) => ({ ...f, term: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {(createTab === 'class' || createTab === 'school') && (
                <>
                  {bulkResult ? (
                    <div className="rounded-xl border border-green-100 bg-green-50/70 px-4 py-4 text-sm text-green-800">
                      <div className="font-semibold mb-1">Done</div>
                      <div>{bulkResult.created} fee{bulkResult.created === 1 ? '' : 's'} created.</div>
                      {bulkResult.skipped > 0 && (
                        <div className="text-xs text-green-700 mt-1">
                          {bulkResult.skipped} student{bulkResult.skipped === 1 ? '' : 's'} already had a fee for this term — skipped.
                        </div>
                      )}
                    </div>
                  ) : bulkStep === 'preview' && bulkPreview ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-4 text-sm">
                        <div className="font-semibold text-amber-800 mb-1">Confirm creation</div>
                        <div className="text-amber-700">
                          This will create <strong>{bulkPreview.eligible}</strong> fee{bulkPreview.eligible === 1 ? '' : 's'}
                          {createTab === 'class' && bulkForm.class_num
                            ? ` for Class ${bulkForm.class_num}`
                            : ' for all active students'}.
                        </div>
                        {bulkPreview.existing > 0 && (
                          <div className="text-amber-600 text-xs mt-1">
                            {bulkPreview.existing} student{bulkPreview.existing === 1 ? '' : 's'} already have a fee for &ldquo;{bulkForm.term}&rdquo; and will be skipped.
                          </div>
                        )}
                        {bulkPreview.eligible === 0 && (
                          <div className="text-amber-600 text-xs mt-1">
                            No new fees to create — all eligible students already have a fee for this term.
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setBulkStep('form'); setBulkPreview(null) }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        ← Back to form
                      </button>
                    </div>
                  ) : (
                    <>
                      {createTab === 'class' && (
                        <div>
                          <label className={labelCls}>Class</label>
                          <select
                            value={bulkForm.class_num}
                            onChange={(e) => setBulkForm((f) => ({ ...f, class_num: e.target.value }))}
                            className={inputCls}
                          >
                            <option value="">Select class…</option>
                            {classes.map((c) => (
                              <option key={c} value={String(c)}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Amount (PKR)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            placeholder="5000"
                            value={bulkForm.amount}
                            onChange={(e) => setBulkForm((f) => ({ ...f, amount: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Due Date</label>
                          <input
                            type="date"
                            value={bulkForm.due_date}
                            onChange={(e) => setBulkForm((f) => ({ ...f, due_date: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Term / Fee type</label>
                        <input
                          type="text"
                          placeholder="e.g. Spring Term 2026"
                          value={bulkForm.term}
                          onChange={(e) => setBulkForm((f) => ({ ...f, term: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowCreate(false); resetCreate() }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                {bulkResult ? 'Close' : 'Cancel'}
              </button>

              {createTab === 'individual' && (
                <button
                  onClick={handleSubmitIndividual}
                  disabled={isActing}
                  className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  {isActing ? 'Creating…' : 'Create fee'}
                </button>
              )}

              {(createTab === 'class' || createTab === 'school') && !bulkResult && (
                bulkStep === 'form' ? (
                  <button
                    onClick={handleBulkPreview}
                    disabled={isActing}
                    className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    {isActing ? 'Checking…' : 'Preview count'}
                  </button>
                ) : (
                  <button
                    onClick={handleBulkCreate}
                    disabled={isActing || (bulkPreview?.eligible ?? 0) === 0}
                    className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    {isActing ? 'Creating…' : 'Create fees'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Record payment modal ──────────────────────────────────────────────── */}
      {payFee && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl flex flex-col max-h-[90dvh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Record payment</h2>
                <button
                  onClick={closePayModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                  </svg>
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {payFee.student?.name} · {payFee.term} · {pkr(Number(payFee.amount))} due
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount paid (PKR)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={payForm.amount_paid}
                    onChange={(e) => setPayForm((f) => ({ ...f, amount_paid: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment date</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Payment method</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className={inputCls}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in full, ref #1234"
                  value={payForm.payment_note}
                  onChange={(e) => setPayForm((f) => ({ ...f, payment_note: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Receipt</label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="receipt_option"
                      value="digital_receipt"
                      checked={payForm.receipt_option === 'digital_receipt'}
                      onChange={() => {
                        setPayForm((f) => ({ ...f, receipt_option: 'digital_receipt' }))
                        setPayFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="accent-[#6fcf6f]"
                    />
                    <span className="text-sm text-gray-700">Generate Uthaan receipt</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="receipt_option"
                      value="uploaded_proof"
                      checked={payForm.receipt_option === 'uploaded_proof'}
                      onChange={() => setPayForm((f) => ({ ...f, receipt_option: 'uploaded_proof' }))}
                      className="accent-[#6fcf6f]"
                    />
                    <span className="text-sm text-gray-700">Upload receipt / proof</span>
                  </label>
                </div>
              </div>

              {payForm.receipt_option === 'uploaded_proof' && (
                <div>
                  <label className={labelCls}>Receipt file (max 5 MB)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setPayFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1a2e1a] file:text-[#6fcf6f] hover:file:bg-[#243d24] cursor-pointer"
                  />
                  {payFile && (
                    <div className="mt-1 text-xs text-gray-400">
                      {payFile.name} ({(payFile.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={closePayModal}
                disabled={isActing}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isActing}
                className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {uploading ? 'Uploading…' : isActing ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
