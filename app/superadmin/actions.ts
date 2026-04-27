'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildDefaultSchoolFeature,
  buildDefaultSchoolFeatures,
  type AiFeatureKey,
} from '@/lib/aiFeatures'
import { SCHOOL_PLAN_PRESETS, isSchoolPlan, type SchoolPlan } from '@/lib/schoolPlans'
import { writeAuditLog } from '@/lib/audit'

// ── Types ──────────────────────────────────────────────────────────────────

export type OnboardCredentials = {
  schoolName: string
  schoolId: string
  adminName: string
  adminEmail: string
  password?: string
  plan?: SchoolPlan
}

export type OnboardResult =
  | { success: true; credentials: OnboardCredentials }
  | { success: false; error: string }

export type DemoStatusUpdateResult = {
  success: boolean
  error: string | null
  savedStatus?: DemoRequestStatus
}

export type SchoolActionResult = {
  success: boolean
  error: string | null
  message?: string
}

const DEMO_REQUEST_STATUSES = ['new', 'contacted', 'approved', 'rejected', 'converted'] as const
export type DemoRequestStatus = (typeof DEMO_REQUEST_STATUSES)[number]
const CONVERTIBLE_DEMO_REQUEST_STATUSES: DemoRequestStatus[] = ['new', 'contacted', 'approved']

// ── Helpers ────────────────────────────────────────────────────────────────

function cryptoPick(charset: string): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return charset[buf[0] % charset.length]
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols

  const chars = [
    cryptoPick(upper),
    cryptoPick(lower),
    cryptoPick(digits),
    cryptoPick(symbols),
    ...Array.from({ length: 8 }, () => cryptoPick(all)),
  ]

  // Fisher-Yates shuffle with crypto randomness
  const order = new Uint32Array(chars.length)
  crypto.getRandomValues(order)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = order[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// ── Guard ──────────────────────────────────────────────────────────────────

async function assertSuperadmin() {
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

  if (roleData?.role !== 'superadmin') redirect('/dashboard')

  return {
    userId: user.id,
    schoolId: roleData.school_id as string | null,
  }
}

export async function updateDemoRequestStatus(
  _prevState: DemoStatusUpdateResult,
  formData: FormData
): Promise<DemoStatusUpdateResult> {
  await assertSuperadmin()

  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim() as DemoRequestStatus

  if (!id || !DEMO_REQUEST_STATUSES.includes(status)) {
    return { success: false, error: 'Choose a valid request status.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { error } = await admin
    .from('demo_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message || 'Could not update request status.' }
  }

  revalidatePath('/superadmin/demo-requests')
  return { success: true, error: null, savedStatus: status }
}

export async function applySchoolPlan(formData: FormData) {
  await assertSuperadmin()

  const schoolId = String(formData.get('school_id') ?? '').trim()
  const plan = String(formData.get('plan') ?? '').trim()

  if (!schoolId || !isSchoolPlan(plan)) {
    redirect('/superadmin')
  }

  const admin = createAdminClient()
  const preset = SCHOOL_PLAN_PRESETS[plan]
  const updatedAt = new Date().toISOString()

  await admin
    .from('schools')
    .update({ plan })
    .eq('id', schoolId)

  await admin
    .from('school_features')
    .upsert(
      (Object.entries(preset) as Array<[AiFeatureKey, { enabled: boolean; monthly_limit: number }]>).map(
        ([featureKey, config]) => ({
          school_id: schoolId,
          feature_key: featureKey,
          enabled: config.enabled,
          monthly_limit: config.monthly_limit,
          updated_at: updatedAt,
        })
      ),
      { onConflict: 'school_id,feature_key' }
    )

  revalidatePath('/superadmin')
  redirect('/superadmin')
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function onboardSchool(
  _prevState: OnboardResult | null,
  formData: FormData
): Promise<OnboardResult> {
  await assertSuperadmin()

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim().toLowerCase()
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!name || !slug || !firstName || !lastName || !email) {
    return { success: false, error: 'All fields are required.' }
  }

  const admin = createAdminClient()

  // Validate slug uniqueness
  const { data: slugExists } = await admin
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugExists) return { success: false, error: `Slug "${slug}" is already taken.` }

  // Step 1: Create school
  const { data: school, error: schoolErr } = await admin
    .from('schools')
    .insert({ name, slug, is_active: true })
    .select('id')
    .single()

  if (schoolErr || !school) {
    return { success: false, error: schoolErr?.message ?? 'Failed to create school.' }
  }

  const schoolId: string = school.id
  const password = generatePassword()

  await admin
    .from('schools')
    .update({ plan: 'starter' satisfies SchoolPlan })
    .eq('id', schoolId)

  await admin.from('school_features').upsert(buildDefaultSchoolFeatures(schoolId), {
    onConflict: 'school_id,feature_key',
  })

  // Step 2: Create auth user (email already confirmed)
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (authErr || !authData.user) {
    await admin.from('schools').delete().eq('id', schoolId)
    return { success: false, error: authErr?.message ?? 'Failed to create admin user.' }
  }

  const userId = authData.user.id

  // Step 3: Assign role
  const { error: roleErr } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin', school_id: schoolId })

  if (roleErr) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('schools').delete().eq('id', schoolId)
    return { success: false, error: roleErr.message ?? 'Failed to assign admin role.' }
  }

  return {
    success: true,
    credentials: {
      schoolName: name,
      schoolId,
      adminName: `${firstName} ${lastName}`,
      adminEmail: email,
      password,
      plan: 'starter',
    },
  }
}


export async function convertDemoRequest(
  _prevState: OnboardResult | null,
  formData: FormData
): Promise<OnboardResult> {
  await assertSuperadmin()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const demoRequestId = (formData.get('demo_request_id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim().toLowerCase()
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const planRaw = (formData.get('plan') as string)?.trim()

  if (!demoRequestId || !name || !slug || !firstName || !lastName || !email) {
    return { success: false, error: 'All fields are required.' }
  }
  if (!isSchoolPlan(planRaw)) {
    return { success: false, error: 'Invalid plan selected.' }
  }
  const plan: SchoolPlan = planRaw

  const admin = createAdminClient()

  const { data: demoReq, error: demoFetchErr } = await admin
    .from('demo_requests')
    .select('id, status')
    .eq('id', demoRequestId)
    .single()

  if (demoFetchErr || !demoReq) {
    return { success: false, error: 'Demo request not found.' }
  }
  if (demoReq.status === 'converted') {
    return { success: false, error: 'This demo request has already been converted to a school.' }
  }
  if (!CONVERTIBLE_DEMO_REQUEST_STATUSES.includes(demoReq.status as DemoRequestStatus)) {
    return {
      success: false,
      error: `Only new, contacted, or approved requests can be converted. Current status: ${demoReq.status}.`,
    }
  }

  const { data: slugExists } = await admin
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugExists) return { success: false, error: `Slug "${slug}" is already taken.` }

  // Step 1: Create school
  const { data: school, error: schoolErr } = await admin
    .from('schools')
    .insert({ name, slug, plan, is_active: true })
    .select('id')
    .single()

  if (schoolErr || !school) {
    return { success: false, error: schoolErr?.message ?? 'Failed to create school.' }
  }

  const schoolId: string = school.id
  const password = generatePassword()

  // Apply plan to school_features. The school row is inserted with the same plan.
  const preset = SCHOOL_PLAN_PRESETS[plan]
  const updatedAt = new Date().toISOString()
  const { error: featuresErr } = await admin.from('school_features').upsert(
    (Object.entries(preset) as Array<[AiFeatureKey, { enabled: boolean; monthly_limit: number }]>).map(
      ([featureKey, config]) => ({
        school_id: schoolId,
        feature_key: featureKey,
        enabled: config.enabled,
        monthly_limit: config.monthly_limit,
        updated_at: updatedAt,
      })
    ),
    { onConflict: 'school_id,feature_key' }
  )
  if (featuresErr) {
    await admin.from('schools').delete().eq('id', schoolId)
    return { success: false, error: featuresErr.message ?? 'Failed to apply school plan features.' }
  }

  // Step 2: Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (authErr || !authData.user) {
    await admin.from('schools').delete().eq('id', schoolId)
    return { success: false, error: authErr?.message ?? 'Failed to create admin user.' }
  }

  const userId = authData.user.id

  // Step 3: Assign admin role
  const { error: roleErr } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin', school_id: schoolId })

  if (roleErr) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('schools').delete().eq('id', schoolId)
    return { success: false, error: roleErr.message ?? 'Failed to assign admin role.' }
  }

  // Step 4: Mark demo request as converted
  const { data: convertedRequest, error: convertErr } = await admin
    .from('demo_requests')
    .update({
      status: 'converted',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', demoRequestId)
    .in('status', CONVERTIBLE_DEMO_REQUEST_STATUSES)
    .select('id')
    .single()

  if (convertErr || !convertedRequest) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('schools').delete().eq('id', schoolId)
    return {
      success: false,
      error: 'The request could not be marked converted. Nothing was created; please refresh and try again.',
    }
  }

  // Best-effort audit — never blocks conversion
  await writeAuditLog(admin, {
    actor_user_id: user.id,
    action: 'demo_request_converted',
    entity_type: 'demo_request',
    entity_id: demoRequestId,
    new_value: { school_id: schoolId, school_name: name, admin_email: email, plan },
  })

  revalidatePath('/superadmin')
  revalidatePath('/superadmin/demo-requests')

  return {
    success: true,
    credentials: {
      schoolName: name,
      schoolId,
      adminName: `${firstName} ${lastName}`,
      adminEmail: email,
      plan,
    },
  }
}

export async function toggleSchoolStatus(
  schoolId: string,
  currentlyActive: boolean,
  _prevState: SchoolActionResult,
  _formData: FormData
): Promise<SchoolActionResult> {
  const superadmin = await assertSuperadmin()

  if (!schoolId) {
    return { success: false, error: 'Missing school id.' }
  }
  if (superadmin.schoolId === schoolId) {
    return { success: false, error: 'You cannot suspend your own assigned school.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('schools')
    .update({ is_active: !currentlyActive })
    .eq('id', schoolId)

  if (error) {
    return { success: false, error: error.message || 'Could not update school status.' }
  }

  revalidatePath('/superadmin')
  return {
    success: true,
    error: null,
    message: currentlyActive ? 'School suspended.' : 'School activated.',
  }
}

export async function deleteSchool(
  schoolId: string,
  _prevState: SchoolActionResult,
  _formData: FormData
): Promise<SchoolActionResult> {
  await assertSuperadmin()

  if (!schoolId) {
    return { success: false, error: 'Missing school id.' }
  }

  const admin = createAdminClient()
  const linkedTables = [
    'students',
    'user_roles',
    'quizzes',
    'assignments',
    'attendance_logs',
    'timetable',
    'announcements',
    'marks',
    'petty_expenses',
    'student_risk_alerts',
    'announcement_acknowledgements',
  ]

  for (const table of linkedTables) {
    const { count, error } = await admin
      .from(table)
      .select('school_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)

    if (error) {
      return { success: false, error: `Could not verify linked data in ${table}. Suspend the school instead.` }
    }
    if ((count ?? 0) > 0) {
      return {
        success: false,
        error: 'This school has linked data and cannot be deleted safely. Suspend it instead.',
      }
    }
  }

  const { error } = await admin.from('schools').delete().eq('id', schoolId)

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error: 'This school has linked data and cannot be deleted safely. Suspend it instead.',
      }
    }
    return { success: false, error: error.message || 'Could not delete school.' }
  }

  revalidatePath('/superadmin')
  return { success: true, error: null, message: 'School deleted.' }
}

export async function impersonateSchool(schoolId: string) {
  await assertSuperadmin()

  const cookieStore = await cookies()
  cookieStore.set('impersonate_school_id', schoolId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // Not setting maxAge — session-scoped cookie, clears on browser close
  })

  redirect('/dashboard')
}

export async function stopImpersonating() {
  await assertSuperadmin()

  const cookieStore = await cookies()
  cookieStore.delete('impersonate_school_id')

  redirect('/superadmin')
}

export async function updateSchoolFeature(formData: FormData) {
  await assertSuperadmin()

  const schoolId = String(formData.get('school_id') ?? '')
  const featureKey = String(formData.get('feature_key') ?? '') as AiFeatureKey
  const enabled = formData.get('enabled') === 'on'
  const monthlyLimitRaw = String(formData.get('monthly_limit') ?? '').trim()

  if (!schoolId || !featureKey) redirect('/superadmin')

  const monthlyLimit =
    monthlyLimitRaw === '' ? null : Math.max(0, parseInt(monthlyLimitRaw, 10) || 0)

  const admin = createAdminClient()
  await admin
    .from('school_features')
    .upsert(
      {
        school_id: schoolId,
        feature_key: featureKey,
        enabled,
        monthly_limit: monthlyLimit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id,feature_key' }
    )

  revalidatePath('/superadmin')
  redirect('/superadmin')
}

export async function resetSchoolFeatureUsage(schoolId: string, featureKey: AiFeatureKey) {
  await assertSuperadmin()

  const admin = createAdminClient()
  const resetAt = new Date().toISOString()

  await admin
    .from('school_features')
    .upsert(
      {
        ...buildDefaultSchoolFeature(schoolId, featureKey),
        used_this_month: 0,
        last_reset_at: resetAt,
        updated_at: resetAt,
      },
      { onConflict: 'school_id,feature_key' }
    )

  await admin
    .from('school_features')
    .update({
      used_this_month: 0,
      last_reset_at: resetAt,
      updated_at: resetAt,
    })
    .eq('school_id', schoolId)
    .eq('feature_key', featureKey)

  revalidatePath('/superadmin')
  redirect('/superadmin')
}
