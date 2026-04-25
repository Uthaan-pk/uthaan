'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveExpense, rejectExpense } from './actions'

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

export type ExpenseRecord = {
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
  created_by: string
}

type Filter = 'all' | 'pending_approval' | 'approved' | 'rejected'

export default function ApprovalsClient({
  initialExpenses,
}: {
  initialExpenses: ExpenseRecord[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending_approval')

  const pendingCount = initialExpenses.filter((e) => e.status === 'pending_approval').length

  const filtered = filter === 'all'
    ? initialExpenses
    : initialExpenses.filter((e) => e.status === filter)

  const fmt = (n: number) =>
    `Rs ${Math.round(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  function handleApprove(id: string) {
    setError(null)
    setProcessingId(id)
    startTransition(async () => {
      const result = await approveExpense(id)
      setProcessingId(null)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleRejectClick(id: string) {
    setRejectingId(id)
    setRejectReason('')
    setError(null)
  }

  function handleRejectCancel() {
    setRejectingId(null)
    setRejectReason('')
  }

  function handleRejectSubmit(id: string) {
    setError(null)
    setProcessingId(id)
    startTransition(async () => {
      const result = await rejectExpense(id, rejectReason)
      setProcessingId(null)
      setRejectingId(null)
      setRejectReason('')
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`rounded-2xl border px-4 py-4 ${
            pendingCount > 0
              ? 'border-amber-200 bg-amber-50/70'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Pending
          </div>
          <div
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              pendingCount > 0 ? 'text-amber-700' : 'text-gray-900'
            }`}
          >
            {pendingCount}
          </div>
          <div className="mt-1 text-xs text-gray-500">Awaiting your approval</div>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50/70 px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Approved
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-green-700">
            {initialExpenses.filter((e) => e.status === 'approved').length}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {fmt(
              initialExpenses
                .filter((e) => e.status === 'approved')
                .reduce((s, e) => s + Number(e.amount), 0),
            )}{' '}
            total
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Rejected
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            {initialExpenses.filter((e) => e.status === 'rejected').length}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {(['pending_approval', 'approved', 'rejected', 'all'] as Filter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'pending_approval'
                ? `Pending (${pendingCount})`
                : f === 'approved'
                  ? 'Approved'
                  : f === 'rejected'
                    ? 'Rejected'
                    : 'All'}
            </button>
          ),
        )}
      </div>

      {/* Expense list */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">
            {filter === 'pending_approval'
              ? 'Pending expense requests'
              : filter === 'approved'
                ? 'Approved expenses'
                : filter === 'rejected'
                  ? 'Rejected expenses'
                  : 'All expenses'}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            {filter === 'pending_approval'
              ? 'No pending expense requests. The accountant will submit requests here.'
              : 'No records for this filter.'}
          </div>
        ) : (
          filtered.map((exp, i) => (
            <div
              key={exp.id}
              className={`px-5 py-5 ${
                i < filtered.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{exp.title}</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        STATUS_BADGE[exp.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {STATUS_LABEL[exp.status] ?? exp.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                    <span>{exp.category}</span>
                    <span>
                      {new Date(exp.expense_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {exp.vendor && <span>Vendor: {exp.vendor}</span>}
                    <span className="text-gray-400">
                      Submitted{' '}
                      {new Date(exp.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  {exp.description && (
                    <div className="mt-1.5 text-xs text-gray-600">{exp.description}</div>
                  )}
                  {exp.status === 'rejected' && exp.rejection_reason && (
                    <div className="mt-1.5 text-xs text-red-600">
                      Rejection reason: {exp.rejection_reason}
                    </div>
                  )}
                  {exp.status === 'approved' && exp.approved_at && (
                    <div className="mt-1.5 text-xs text-green-700">
                      Approved{' '}
                      {new Date(exp.approved_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  )}

                  {/* Inline rejection form */}
                  {rejectingId === exp.id && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Rejection reason (optional)
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this expense is being rejected…"
                        rows={2}
                        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-red-400 focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectSubmit(exp.id)}
                          disabled={isPending && processingId === exp.id}
                          className="uthaan-button-primary bg-red-700 text-white hover:bg-red-800 text-xs"
                        >
                          {isPending && processingId === exp.id
                            ? 'Rejecting…'
                            : 'Confirm reject'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectCancel}
                          className="uthaan-button-secondary text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-900 pt-0.5">
                    {fmt(Number(exp.amount))}
                  </span>

                  {exp.status === 'pending_approval' && rejectingId !== exp.id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(exp.id)}
                        disabled={isPending && processingId === exp.id}
                        className="uthaan-button-primary text-xs"
                      >
                        {isPending && processingId === exp.id
                          ? 'Approving…'
                          : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectClick(exp.id)}
                        disabled={isPending}
                        className="uthaan-button-secondary text-xs border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
