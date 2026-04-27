'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type TeacherOnboardingResult = {
  success: boolean
  error: string | null
  teacher?: {
    name: string
    email: string
    attachedExisting: boolean
  }
}

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

  return [
    cryptoPick(upper),
    cryptoPick(lower),
    cryptoPick(digits),
    cryptoPick(symbols),
    ...Array.from({ length: 12 }, () => cryptoPick(all)),
  ].join('')
}

function splitTeacherName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? 'Teacher'
  const lastName = parts.slice(1).join(' ') || 'Staff'
  return { firstName, lastName }
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalized = email.toLowerCase()

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null

    const match = data.users.find((user) => user.email?.toLowerCase() === normalized)
    if (match) return match
    if (data.users.length < 1000) return null
  }

  return null
}

export async function createTeacherAccount(
  _prevState: TeacherOnboardingResult,
  formData: FormData
): Promise<TeacherOnboardingResult> {
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

  const callerRole = roleData?.role as string | undefined
  let schoolId = (roleData?.school_id as string | null) ?? null

  if (callerRole === 'superadmin') {
    const cookieStore = await cookies()
    schoolId = cookieStore.get('impersonate_school_id')?.value ?? null
  }

  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return { success: false, error: 'Only school admins can create teacher accounts.' }
  }
  if (!schoolId) {
    return { success: false, error: 'No school is selected for teacher onboarding.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!name || !email) {
    return { success: false, error: 'Teacher name and email are required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Enter a valid teacher email address.' }
  }

  const admin = createAdminClient()
  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .single()

  if (schoolError || !school) {
    return { success: false, error: 'Selected school was not found.' }
  }

  const { firstName, lastName } = splitTeacherName(name)
  const existingAuthUser = await findAuthUserByEmail(admin, email)

  if (existingAuthUser) {
    const { data: existingRoles, error: rolesError } = await admin
      .from('user_roles')
      .select('user_id, role, school_id')
      .eq('user_id', existingAuthUser.id)

    if (rolesError) {
      return { success: false, error: 'Could not verify existing user roles.' }
    }

    const roles = existingRoles ?? []
    if (roles.some((role) => role.role === 'teacher' && role.school_id === schoolId)) {
      return { success: false, error: 'This email is already a teacher for this school.' }
    }
    if (roles.some((role) => role.role === 'superadmin')) {
      return { success: false, error: 'This email belongs to a platform admin and cannot be attached as a teacher.' }
    }
    if (roles.some((role) => role.school_id && role.school_id !== schoolId)) {
      return { success: false, error: 'This email is already linked to another school.' }
    }

    const { error: insertRoleError } = await admin
      .from('user_roles')
      .insert({ user_id: existingAuthUser.id, role: 'teacher', school_id: schoolId, student_id: null })

    if (insertRoleError) {
      return { success: false, error: insertRoleError.message || 'Could not attach teacher role.' }
    }

    await admin.auth.admin.updateUserById(existingAuthUser.id, {
      user_metadata: { first_name: firstName, last_name: lastName, full_name: name },
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    revalidatePath('/superadmin')
    return {
      success: true,
      error: null,
      teacher: { name, email, attachedExisting: true },
    }
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: generatePassword(),
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, full_name: name },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Could not create teacher account.' }
  }

  const { error: insertRoleError } = await admin
    .from('user_roles')
    .insert({ user_id: authData.user.id, role: 'teacher', school_id: schoolId, student_id: null })

  if (insertRoleError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: insertRoleError.message || 'Could not assign teacher role.' }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/superadmin')
  return {
    success: true,
    error: null,
    teacher: { name, email, attachedExisting: false },
  }
}
