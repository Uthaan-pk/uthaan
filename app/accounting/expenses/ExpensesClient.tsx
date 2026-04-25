'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense } from './actions'

const CATEGORIES = [
  'Art Supplies',
  'Stationery',
  'Events',
  'Repairs',
  'Cleaning Supplies',
  'Exam Printing',
  'Decorations',
  'Teacher Reimbursement',
  'Transport / Petrol',
  'Other',
]

const STATUS_BADGE: Record<string, string> = {
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  paid: 'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
}

type Expense = {
  id: string
  title: string
  category: string
  amount: number
  expense_date: string
  vendor: string | null
  description: string | null
  status: string
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
}

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

const emptyForm = {
  title: '',
  category: CATEGORIES[0],
  amount: '',
  expense_date: today,
  vendor: '',
  description: '',
}

export default function ExpensesClient({
  initialExpenses,
}: {
  initialExpenses: Expense[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const pendingCount = initialExpenses.filter((e) => e.status === 'pending_approval').length
  const approvedThisMonth = initialExpenses
    .filter((e) => e.status === 'approved' && e.approved_at?.slice(0, 7) === thisMonth)
    .reduce((s, e) => s + Number(e.amount), 0)
  const rejectedCount = initialExpenses.filter((e) => e.status === 'rejected').length

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('category', form.category)
    fd.append('amount', form.amount)
    fd.append('expense_date', form.expense_date)
    fd.append('vendor', form.vendor)
    fd.append('description', form.description)

    startTransition(async () => {
      const result = await createExpense(fd)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setForm(emptyForm)
        setShowForm(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border px-4 py-4 ${pendingCount > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-gray-200 bg-white'}`}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Pending approval</div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight ${pendingCount > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Approved this month</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">{fmt(approvedThisMonth)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Rejected</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{rejectedCount}</div>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Expense request submitted. It will appear in the list below and needs admin approval.
        </div>
      )}

      {/* New expense form toggle */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">New expense request</div>
            <div className="mt-1 text-sm text-gray-500">
              Submit a petty expense for admin approval.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v)
              setError(null)
              setSuccess(false)
            }}
            className="uthaan-button-primary text-xs"
          >
            {showForm ? 'Cancel' : '+ New request'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Art supplies for class 5"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#6fcf6f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm focus:border-[#6fcf6f] focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount (Rs) <span className="text-red-500">*</span>
                </label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#6fcf6f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Expense date <span className="text-red-500">*</span>
                </label>
                <input
                  name="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm focus:border-[#6fcf6f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Vendor / supplier
                </label>
                <input
                  name="vendor"
                  value={form.vendor}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#6fcf6f] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional — provide context for the admin approving this request."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-[#fafcf9] px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#6fcf6f] focus:outline-none resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="uthaan-button-primary"
              >
                {isPending ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Expenses list */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">All expense requests</div>
          <div className="mt-1 text-sm text-gray-500">Your school&apos;s expense history, including status from the admin.</div>
        </div>

        {initialExpenses.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No expense requests yet. Submit your first request above.
          </div>
        ) : (
          <div>
            {initialExpenses.map((exp, i) => (
              <div
                key={exp.id}
                className={`px-5 py-4 ${i < initialExpenses.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{exp.title}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[exp.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {STATUS_LABEL[exp.status] ?? exp.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                      <span>{exp.category}</span>
                      <span>{new Date(exp.expense_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {exp.vendor && <span>Vendor: {exp.vendor}</span>}
                      {exp.description && <span className="truncate max-w-xs">{exp.description}</span>}
                    </div>
                    {exp.status === 'rejected' && exp.rejection_reason && (
                      <div className="mt-1.5 text-xs text-red-600">
                        Reason: {exp.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 shrink-0">
                    Rs {Number(exp.amount).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
