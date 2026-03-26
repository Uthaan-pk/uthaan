'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Student = {
  id: string
  name: string
  class_num: number | null
}

type Fee = {
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
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'

const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

const emptyForm = { student_id: '', amount: '', due_date: '', term: '' }

export default function FeesClient({
  initialFees,
  students,
}: {
  initialFees: Fee[]
  students: Student[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [fees, setFees] = useState(initialFees)
  const [acting, setActing] = useState<string | null>(null)

  // Filters
  const [filterClass, setFilterClass]   = useState('all')
  const [filterTerm, setFilterTerm]     = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modal
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalAssigned    = fees.length
  const totalCollected   = fees.filter(f => f.paid).reduce((s, f) => s + Number(f.amount), 0)
  const totalOutstanding = fees.filter(f => !f.paid).reduce((s, f) => s + Number(f.amount), 0)

  // ── Filter options derived from data ─────────────────────────────────────
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

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => fees.filter(f => {
    if (filterClass !== 'all' && String(f.student?.class_num) !== filterClass) return false
    if (filterTerm  !== 'all' && f.term !== filterTerm) return false
    if (filterStatus !== 'all') {
      const s = statusOf(f)
      if (filterStatus === 'paid'    && s !== 'paid')    return false
      if (filterStatus === 'unpaid'  && s === 'paid')    return false
      if (filterStatus === 'overdue' && s !== 'overdue') return false
    }
    return true
  }), [fees, filterClass, filterTerm, filterStatus])

  // ── Actions ───────────────────────────────────────────────────────────────
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
    toast.success('Marked as unpaid.')
  }

  async function handleAssignFee() {
    if (!form.student_id)                       { toast.error('Select a student.'); return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Enter a valid amount.'); return }
    if (!form.due_date)                          { toast.error('Due date is required.'); return }
    if (!form.term.trim())                       { toast.error('Term is required.'); return }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('fees')
      .insert({
        student_id: form.student_id,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        term: form.term.trim(),
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

  function closeModal() {
    setShowModal(false)
    setForm(emptyForm)
  }

  const pkr = (n: number) =>
    n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto bg-[#f8f7f4] p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fees</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage student fee assignments and payments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Assign Fee
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Assigned"      value={String(totalAssigned)} />
        <StatCard label="Total Collected"     value={`PKR ${pkr(totalCollected)}`} />
        <StatCard label="Total Outstanding"   value={`PKR ${pkr(totalOutstanding)}`} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 mb-4 flex flex-wrap gap-3">
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
        >
          <option value="all">All classes</option>
          {classes.map(c => <option key={c} value={String(c)}>Class {c}</option>)}
        </select>

        <select
          value={filterTerm}
          onChange={e => setFilterTerm(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
        >
          <option value="all">All terms</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm text-gray-400">No fees found</div>
            <div className="text-xs text-gray-300 mt-1">Try adjusting the filters or assign a new fee.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Student', 'Class', 'Term', 'Amount (PKR)', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(fee => {
                  const status = statusOf(fee)
                  return (
                    <tr key={fee.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {fee.student?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {fee.student?.class_num != null ? `Class ${fee.student.class_num}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{fee.term}</td>
                      <td className="px-5 py-3.5 text-gray-900 font-medium whitespace-nowrap">
                        {pkr(Number(fee.amount))}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {new Date(fee.due_date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {fee.paid ? (
                          <button
                            onClick={() => handleMarkUnpaid(fee)}
                            disabled={acting === fee.id}
                            className="text-[11px] text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {acting === fee.id ? '…' : 'Mark Unpaid'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(fee)}
                            disabled={acting === fee.id}
                            className="text-[11px] text-[#1a2e1a] hover:text-[#6fcf6f] border border-gray-200 hover:border-[#6fcf6f]/40 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {acting === fee.id ? '…' : 'Mark Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Fee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Assign Fee</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 5000"
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
                  placeholder="e.g. Term 1 2025"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFee}
                disabled={submitting}
                className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
    </div>
  )
}
