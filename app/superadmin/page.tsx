import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Fragment } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  toggleSchoolStatus,
  deleteSchool,
  impersonateSchool,
  stopImpersonating,
  updateSchoolFeature,
  resetSchoolFeatureUsage,
} from './actions'
import OnboardSchoolForm from './OnboardSchoolForm'
import UsageTable, { type UsageRow } from './UsageTable'
import { TERM_START_DATE } from '@/lib/constants'
import { buildAttendanceMap } from '@/lib/attendanceLeaves'
import { AI_FEATURES, type SchoolFeatureRow } from '@/lib/aiFeatures'

type SchoolRow = {
  id: string
  name: string
  slug: string
  is_active: boolean | null
  created_at: string | null
  student_count: number
  user_count: number
}

export default async function SuperadminPage() {
  // ── Auth guard ─────────────────────────────────────────────────────────
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

  // ── Data ───────────────────────────────────────────────────────────────
  const admin = createAdminClient()

  const [schoolsRes, studentsRes, usersRes, quizzesRes, assignmentsRes, attLogsRes, featuresRes] = await Promise.all([
    admin.from('schools').select('id, name, slug, is_active, created_at').order('created_at'),
    admin.from('students').select('id, school_id, is_active'),
    admin.from('user_roles').select('user_id, school_id, role'),
    admin.from('quizzes').select('id, school_id, created_at').gte('created_at', TERM_START_DATE),
    admin.from('assignments').select('id, school_id, created_at').gte('created_at', TERM_START_DATE),
    admin.from('attendance_logs').select('student_id, status, school_id').gte('day', TERM_START_DATE),
    admin.from('school_features').select('id, school_id, feature_key, enabled, monthly_limit, used_this_month, last_reset_at, created_at, updated_at'),
  ])

  const schools: SchoolRow[] = (schoolsRes.data ?? []).map((s: any) => ({
    ...s,
    student_count: (studentsRes.data ?? []).filter((st: any) => st.school_id === s.id && st.is_active !== false).length,
    user_count: (usersRes.data ?? []).filter(
      (u: any) => u.school_id === s.id && u.role !== 'superadmin'
    ).length,
  }))

  // Build per-school usage rows
  const attLogsBySchool = new Map<string, Array<{ student_id: string; status: string }>>()
  for (const log of attLogsRes.data ?? []) {
    const sid = (log as any).school_id as string | null
    if (!sid) continue
    if (!attLogsBySchool.has(sid)) attLogsBySchool.set(sid, [])
    attLogsBySchool.get(sid)!.push({ student_id: (log as any).student_id, status: (log as any).status })
  }

  const usageRows: UsageRow[] = (schoolsRes.data ?? []).map((s: any) => {
    const schoolStudents = (studentsRes.data ?? []).filter(
      (st: any) => st.school_id === s.id && st.is_active !== false
    )
    const teachers = (usersRes.data ?? []).filter(
      (u: any) => u.school_id === s.id && u.role === 'teacher'
    ).length
    const quizzes = (quizzesRes.data ?? []).filter((q: any) => q.school_id === s.id).length
    const assignments = (assignmentsRes.data ?? []).filter((a: any) => a.school_id === s.id).length

    const schoolLogs = attLogsBySchool.get(s.id) ?? []
    let avgAttendance: number | null = null
    if (schoolLogs.length > 0) {
      const attMap = buildAttendanceMap(schoolLogs)
      const pcts = Object.values(attMap).filter((p): p is number => p !== null)
      avgAttendance = pcts.length > 0
        ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
        : null
    }

    return {
      schoolId: s.id,
      schoolName: s.name,
      students: schoolStudents.length,
      teachers,
      quizzes,
      assignments,
      avgAttendance,
    }
  })

  // ── Active impersonation ────────────────────────────────────────────────
  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get('impersonate_school_id')?.value ?? null
  const impersonatingSchool = impersonatingId
    ? schools.find((s) => s.id === impersonatingId)
    : null

  const featureMap = new Map<string, Record<string, SchoolFeatureRow>>()
  for (const row of (featuresRes.data ?? []) as SchoolFeatureRow[]) {
    if (!featureMap.has(row.school_id)) featureMap.set(row.school_id, {})
    featureMap.get(row.school_id)![row.feature_key] = row
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Top bar */}
      <header className="bg-[#1a2e1a] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-[#6fcf6f] tracking-tight">Uthaan</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/60 text-xs font-medium uppercase tracking-widest">Superadmin</span>
        </div>
        <a
          href="/dashboard"
          className="text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          ← App
        </a>
      </header>

      {/* Impersonation banner */}
      {impersonatingSchool && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
          <span className="text-xs text-amber-800 font-medium">
            Browsing as: <span className="font-bold">{impersonatingSchool.name}</span>
          </span>
          <form action={stopImpersonating}>
            <button
              type="submit"
              className="text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
            >
              Stop impersonating
            </button>
          </form>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Add New School */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Add New School</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Creates the school and an admin account in one step.
            </p>
          </div>
          <OnboardSchoolForm />
        </section>

        {/* Usage table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">School Usage</h2>
          <p className="text-xs text-gray-400 mb-3">Current term stats. Click column headers to sort.</p>
          {usageRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-10 text-center text-sm text-gray-400">
              No schools yet.
            </div>
          ) : (
            <UsageTable rows={usageRows} />
          )}
        </section>

        {/* Schools table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Schools{' '}
            <span className="text-gray-400 font-normal">({schools.length})</span>
          </h2>

          {schools.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-5 py-10 text-center text-sm text-gray-400">
              No schools yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Slug</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Students</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Users</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Created</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school, i) => (
                    <Fragment key={school.id}>
                    <tr
                      key={school.id}
                      className="border-b border-gray-50"
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900">{school.name}</td>
                      <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{school.slug}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                        {school.student_count}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                        {school.user_count}
                      </td>
                      <td className="px-5 py-3.5">
                        {school.is_active === false ? (
                          <span className="text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                            Suspended
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {school.created_at
                          ? new Date(school.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {/* Impersonate */}
                          <form action={impersonateSchool.bind(null, school.id)}>
                            <button
                              type="submit"
                              className="text-xs text-[#1a2e1a]/60 hover:text-[#1a2e1a] border border-gray-200 hover:border-[#6fcf6f]/50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Browse
                            </button>
                          </form>

                          {/* Suspend / Activate */}
                          <form action={toggleSchoolStatus.bind(null, school.id, school.is_active !== false)}>
                            <button
                              type="submit"
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                school.is_active === false
                                  ? 'text-green-700 border-green-200 hover:border-green-400 hover:text-green-800'
                                  : 'text-amber-700 border-amber-200 hover:border-amber-400 hover:text-amber-800'
                              }`}
                            >
                              {school.is_active === false ? 'Activate' : 'Suspend'}
                            </button>
                          </form>

                          {/* Delete */}
                          <DeleteButton schoolId={school.id} schoolName={school.name} />
                        </div>
                      </td>
                    </tr>
                    <tr className={i < schools.length - 1 ? 'border-b border-gray-50' : ''}>
                      <td colSpan={7} className="bg-[#fafcf9] px-5 py-4">
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-gray-900">Features &amp; Limits</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Superadmin-managed feature access and monthly AI usage controls for {school.name}.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {AI_FEATURES.map((feature) => (
                            <FeatureCard
                              key={`${school.id}-${feature.key}`}
                              schoolId={school.id}
                              featureKey={feature.key}
                              label={feature.label}
                              description={feature.description}
                              feature={featureMap.get(school.id)?.[feature.key] ?? null}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function FeatureCard({
  schoolId,
  featureKey,
  label,
  description,
  feature,
}: {
  schoolId: string
  featureKey: string
  label: string
  description: string
  feature: SchoolFeatureRow | null
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
      </div>

      <form action={updateSchoolFeature} className="space-y-3">
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="feature_key" value={featureKey} />

        <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-[#fafcf9] px-3 py-2.5">
          <span className="text-sm font-medium text-gray-800">Enabled</span>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={feature?.enabled ?? false}
            className="h-4 w-4 rounded border-gray-300 text-[#1a2e1a] focus:ring-[#6fcf6f]/40"
          />
        </label>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Monthly limit
          </label>
          <input
            type="number"
            name="monthly_limit"
            min="0"
            defaultValue={feature?.monthly_limit ?? ''}
            placeholder="Unlimited"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-[#fafcf9] px-3 py-2.5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Used this month
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {feature?.used_this_month ?? 0}
            </div>
          </div>
          <div className="text-right text-[11px] text-gray-500">
            {feature?.last_reset_at
              ? `Reset ${new Date(feature.last_reset_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : 'Not reset yet'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            formAction={resetSchoolFeatureUsage.bind(null, schoolId, featureKey)}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300 transition-colors"
          >
            Reset usage
          </button>

          <button
            type="submit"
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Save feature settings
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Delete button with confirmation (client component) ─────────────────────

function DeleteButton({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  return (
    <form
      action={deleteSchool.bind(null, schoolId)}
      onSubmit={
        // inline onSubmit via script attribute won't work in RSC; use a client trick below
        undefined
      }
    >
      <DeleteConfirmButton schoolName={schoolName} />
    </form>
  )
}

// Needs 'use client' for onClick confirm — extracted as a tiny client component
import DeleteConfirmButton from './DeleteConfirmButton'
