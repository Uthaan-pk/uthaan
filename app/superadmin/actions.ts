'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ──────────────────────────────────────────────────────────────────

export type OnboardCredentials = {
  schoolName: string
  schoolId: string
  adminName: string
  adminEmail: string
  password: string
}

export type OnboardResult =
  | { success: true; credentials: OnboardCredentials }
  | { success: false; error: string }

// ── Helpers ────────────────────────────────────────────────────────────────

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols
  // Guarantee at least one of each character class
  const guaranteed = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)])
  return [...guaranteed, ...rest].sort(() => Math.random() - 0.5).join('')
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
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'superadmin') redirect('/dashboard')
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
    },
  }
}


export async function toggleSchoolStatus(schoolId: string, currentlyActive: boolean) {
  await assertSuperadmin()

  const admin = createAdminClient()
  await admin
    .from('schools')
    .update({ is_active: !currentlyActive })
    .eq('id', schoolId)

  redirect('/superadmin')
}

export async function deleteSchool(schoolId: string) {
  await assertSuperadmin()

  const admin = createAdminClient()
  await admin.from('schools').delete().eq('id', schoolId)

  redirect('/superadmin')
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
