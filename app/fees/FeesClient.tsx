'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Student = {
  id: string
  name: string
  class_num: number | null
}

export type Fee = {
  id: string
  student_id: string
  amount: number
  due_date: string
  paid: boolean
  paid_at: string | null
  term: string
  created_at: string
  student: { name: string; class_num: number | null } | null
}

type Status = 'paid' | 'overdue' | 'pending'

function statusOf(fee: Fee): Status {
  if (fee.paid) return 'paid'
  const today = new Date().toISOString().split('T')[0]
  return fee.due_date < today ? 'overdue' : 'pending'
}

const STATUS_BADGE: Record<Status, string> = {
  paid:    'bg-green-50 text-green-700 border-green-100',
  overdue: 'bg-red-50 text-red-600 border-red-100',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
}

const STATUS_LABEL: Record<Status, string> = {
  paid:    'Paid',
  overdue: 'Overdue',
  pending: 'Pending',
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'

const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

const emptyForm = { student_id: '', amount: '', due_date: '', term: '' }
const PAGE_SIZE = 50

function pkr(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function FeesClient({
  initialFees,
  students,
}: {
  initialFees: Fee[]
  students: Student[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [fees, setFees]     = useState(initialFees)
  const [acting, setActing] = useState<string | null>(null)
  const [confirmUnpaidId, setConfirmUnpaidId] = useState<string | null>(null)

  // Filters
  const [filterClass,  setFilterClass]  = useState('all')
  const [filterTerm,   setFilterTerm]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Pagination
  const [page, setPage] = useState(1)

  // Modal
  const [showModal,   setShowModal]   = useState(false)
  const [form,        setForm]        = useState(emptyForm)
  const [submitting,  setSubmitting]  = useState(false)

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalCollected   = fees.filter(f =>  f.paid).reduce((s, f) => s + Number(f.amount), 0)
  const totalOutstanding = fees.filter(f => !f.paid).reduce((s, f) => s + Number(f.amount), 0)

  // ── Filter options ────────────────────────────────────────────────────────────
  const classes = useMemo(() => {
    const set = new Set<number>()
    fees.forEach(f => { if (f.student?.class_num != null) set.add(f.student.class_num) })
    return Array.from(set).sort((a, b) => a - b)
  }, [fees])

  const terms = useMemo(() => {
    const set = new Set<string>()
    fees.forEach(f => set.add(f.term))
    return Array.from(set).sort()
  }, [fees])

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    setPage(1)
    return fees.filter(f => {
      if (filterClass  !== 'all' && String(f.student?.class_num) !== filterClass) return false
      if (filterTerm   !== 'all' && f.term !== filterTerm)                         return false
      if (filterStatus !== 'all') {
        const s = statusOf(f)
        if (filterStatus === 'paid'    && s !== 'paid')    return false
        if (filterStatus === 'unpaid'  && s === 'paid')    return false
        if (filterStatus === 'overdue' && s !== 'overdue') return false
      }
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fees, filterClass, filterTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleMarkPaid(fee: Fee) {
    setActing(fee.id)
    const paidAt = new Date().toISOString()
    const { error } = await supabase
      .from('fees')
      .update({ paid: true, paid_at: paidAt })
      .eq('id', fee.id)
    setActing(null)
    if (error) { toast.error(error.message); return }
    setFees(prev => prev.map(f => f.id === fee.id ? { ...f, paid: true, paid_at: paidAt } : f))
    toast.success('Marked as paid.')
  }

  async function handleMarkUnpaid(fee: Fee) {
    setActing(fee.id)
    const { error } = await supabase
      .from('fees')
      .update({ paid: false, paid_at: null })
      .eq('id', fee.id)
    setActing(null)
    if (error) { toast.error(error.message); return }
    setFees(prev => prev.map(f => f.id === fee.id ? { ...f, paid: false, paid_at: null } : f))
    setConfirmUnpaidId(null)
    toast.success('Marked as unpaid.')
  }

  async function handleAssignFee() {
    if (!form.student_id)                          { toast.error('Select a student.');      return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Enter a valid amount.');  return }
    if (!form.due_date)                            { toast.error('Due date is required.');   return }
    if (!form.term.trim())                         { toast.error('Term is required.');       return }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('fees')
      .insert({
        student_id: form.student_id,
        amount:     parseFloat(form.amount),
        due_date:   form.due_date,
        term:       form.term.trim(),
      })
      .select('*, student:students(name, class_num)')
      .single()
    setSubmitting(false)

    if (error) { toast.error(error.message); return }
    setFees(prev => [data, ...prev])
    setShowModal(false)
    setForm(emptyForm)
    toast.success('Fee assigned.')
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="uthaan-page-main">

      {/* Standard page header */}
      <header className="uthaan-page-header">
        <h1 className="text-sm font-semibold text-gray-900">Fees</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors min-h-[36px]"
        >
          + Assign Fee
        </button>
      </header>

      <main className="uthaan-page-content space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total records"   value={String(fees.length)} />
          <StatCard label="Collected"       value={`PKR ${pkr(totalCollected)}`} accent="green" />
          <StatCard label="Outstanding"     value={`PKR ${pkr(totalOutstanding)}`} accent={totalOutstanding > 0 ? 'red' : undefined} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap gap-2">
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All classes</option>
            {classes.map(c => <option key={c} value={String(c)}>Class {c}</option>)}
          </select>

          <select
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All terms</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 min-h-[44px]"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>

          {filtered.length !== fees.length && (
            <span className="self-center text-xs text-gray-500 ml-1">
              {filtered.length} of {fees.length}
            </span>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              {fees.length === 0 ? (
                <>
                  <div className="text-sm font-medium text-gray-900 mb-1">No fees recorded yet</div>
                  <div className="text-xs text-gray-400 mb-4">Assign a fee to a student to get started.</div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-[#243d24] transition-colors"
                  >
                    + Assign first fee
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-gray-900 mb-1">No fees match these filters</div>
                  <div className="text-xs text-gray-400">Try adjusting the filters above.</div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table — hidden on small screens */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Student', 'Class', 'Term', 'Amount (PKR)', 'Due Date', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(fee => {
                      const status = statusOf(fee)
                      const isConfirming = confirmUnpaidId === fee.id
                      return (
                        <tr key={fee.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
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
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}>
                              {STATUS_LABEL[status]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {fee.paid ? (
                                isConfirming ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleMarkUnpaid(fee)}
                                      disabled={acting === fee.id}
                                      className="text-[11px] text-white bg-red-500 hover:bg-red-600 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {acting === fee.id ? '…' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmUnpaidId(null)}
                                      className="text-[11px] text-gray-400 hover:text-gray-600 px-1"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmUnpaidId(fee.id)}
                                    className="text-[11px] text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded px-2 py-1 transition-colors whitespace-nowrap"
                                  >
                                    Mark Unpaid
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() => handleMarkPaid(fee)}
                                  disabled={acting === fee.id}
                                  className="text-[11px] text-[#1a2e1a] hover:text-[#6fcf6f] border border-gray-200 hover:border-[#6fcf6f]/40 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {acting === fee.id ? '…' : 'Mark Paid'}
                                </button>
                              )}
                              <a
                                href={`/fees/receipt/${fee.student_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-gray-400 hover:text-[#1a2e1a] border border-gray-200 hover:border-gray-300 rounded px-2 py-1 transition-colors whitespace-nowrap"
                              >
                                Print receipt
                              </a>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list — visible only on small screens */}
              <div className="sm:hidden divide-y divide-gray-50">
                {pageRows.map(fee => {
                  const status      = statusOf(fee)
                  const isConfirming = confirmUnpaidId === fee.id
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
                        <span className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="text-base font-semibold text-gray-900">
                            PKR {pkr(Number(fee.amount))}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Due {new Date(fee.due_date).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                            {fee.paid && fee.paid_at && (
                              <> · Paid {new Date(fee.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {fee.paid ? (
                            isConfirming ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleMarkUnpaid(fee)}
                                  disabled={acting === fee.id}
                                  className="text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-2 min-h-[40px] disabled:opacity-50"
                                >
                                  {acting === fee.id ? '…' : 'Confirm unpaid'}
                                </button>
                                <button
                                  onClick={() => setConfirmUnpaidId(null)}
                                  className="text-xs text-gray-400 px-2 py-2"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmUnpaidId(fee.id)}
                                className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 min-h-[40px] hover:border-red-200 hover:text-red-600 transition-colors"
                              >
                                Mark Unpaid
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(fee)}
                              disabled={acting === fee.id}
                              className="text-xs font-medium bg-[#1a2e1a] text-[#6fcf6f] rounded-lg px-3 py-2 min-h-[40px] hover:bg-[#243d24] disabled:opacity-50 transition-colors"
                            >
                              {acting === fee.id ? '…' : 'Mark Paid'}
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
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-white rounded-b-xl">
              <span className="text-xs text-gray-400">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-3 text-xs text-gray-500">{safePage} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

      {/* Assign Fee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Assign Fee</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm) }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" />
                  <line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Student</label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Select student…</option>
                  {students.map(s => (
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
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="5000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Term</label>
                <input
                  type="text"
                  value={form.term}
                  onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                  placeholder="e.g. Spring Term 2026"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFee}
                disabled={submitting}
                className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {submitting ? 'Assigning…' : 'Assign Fee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold truncate ${
        accent === 'green' ? 'text-green-700' : accent === 'red' ? 'text-red-600' : 'text-gray-900'
      }`}>
        {value}
      </div>
    </div>
  )
}
