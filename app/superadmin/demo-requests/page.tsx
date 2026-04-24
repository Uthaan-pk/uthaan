import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateDemoRequestStatus, type DemoRequestStatus } from '../actions'

type DemoRequestRow = {
  id: string
  school_name: string
  contact_name: string
  role_title: string | null
  email: string
  phone: string | null
  city: string | null
  student_count: number | null
  message: string | null
  requested_plan: 'not_sure' | 'starter' | 'growth' | 'pro' | 'enterprise'
  status: DemoRequestStatus
  reviewed_at: string | null
  created_at: string
}

const STATUSES: DemoRequestStatus[] = ['new', 'contacted', 'approved', 'rejected', 'converted']
const REQUESTED_PLAN_LABELS: Record<DemoRequestRow['requested_plan'], string> = {
  not_sure: 'Not sure yet',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export default async function DemoRequestsPage() {
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

  if (roleData?.role !== 'superadmin') redirect('/dashboard')

  const admin = createAdminClient()
  const { data } = await admin
    .from('demo_requests')
    .select('id, school_name, contact_name, role_title, email, phone, city, student_count, message, requested_plan, status, reviewed_at, created_at')
    .order('created_at', { ascending: false })

  const requests = (data ?? []) as DemoRequestRow[]

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <header className="flex h-14 items-center justify-between bg-[#1a2e1a] px-6">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-[#6fcf6f]">Uthaan</span>
          <span className="text-xs font-medium uppercase tracking-widest text-white/60">
            Superadmin
          </span>
        </div>
        <Link
          href="/superadmin"
          className="text-xs text-white/50 transition-colors hover:text-white/80"
        >
          ← Back
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Demo Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              Public pilot/demo requests awaiting manual review.
            </p>
          </div>
          <div className="text-sm text-gray-400">{requests.length} total</div>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400">
            No demo requests yet.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <section
                key={request.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-base font-semibold text-gray-900">
                        {request.school_name}
                      </h2>
                      <span className="rounded-full bg-[#6fcf6f]/10 px-2.5 py-1 text-[11px] font-medium capitalize text-[#1a2e1a]">
                        {request.status}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <span className="font-medium text-gray-900">Contact:</span>{' '}
                        {request.contact_name}
                        {request.role_title ? ` · ${request.role_title}` : ''}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Email:</span> {request.email}
                      </div>
                      {request.phone ? (
                        <div>
                          <span className="font-medium text-gray-900">Phone:</span> {request.phone}
                        </div>
                      ) : null}
                      {request.city ? (
                        <div>
                          <span className="font-medium text-gray-900">City:</span> {request.city}
                        </div>
                      ) : null}
                      {request.student_count !== null ? (
                        <div>
                          <span className="font-medium text-gray-900">Students:</span>{' '}
                          {request.student_count}
                        </div>
                      ) : null}
                      <div>
                        <span className="font-medium text-gray-900">Interested plan:</span>{' '}
                        {REQUESTED_PLAN_LABELS[request.requested_plan]}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Requested:</span>{' '}
                        {new Date(request.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {request.message ? (
                      <div className="rounded-xl bg-[#f8f7f4] px-4 py-3 text-sm leading-6 text-gray-600">
                        {request.message}
                      </div>
                    ) : null}
                  </div>

                  <form action={updateDemoRequestStatus} className="min-w-[220px] space-y-2">
                    <input type="hidden" name="id" value={request.id} />
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Update status
                    </label>
                    <select
                      name="status"
                      defaultValue={request.status}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#6fcf6f] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/30"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-[#1a2e1a] px-4 py-2.5 text-sm font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24]"
                    >
                      Save status
                    </button>
                    <div className="text-xs text-gray-400">
                      {request.reviewed_at
                        ? `Last reviewed ${new Date(request.reviewed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}`
                        : 'Not reviewed yet'}
                    </div>
                  </form>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
