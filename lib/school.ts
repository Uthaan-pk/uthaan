import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SchoolContext = {
  /** null only for superadmin with no active impersonation */
  schoolId: string | null
  role: string
  isImpersonating: boolean
}

/**
 * Returns the effective school context for the given user.
 *
 * - Regular users: schoolId is read from user_roles
 * - Superadmin with no impersonation: schoolId = null (sees all data)
 * - Superadmin impersonating a school: schoolId = impersonated school id
 *   (set by middleware via x-effective-school-id header)
 */
export async function getSchoolContext(
  supabase: SupabaseClient,
  userId: string
): Promise<SchoolContext | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', userId)
    .single()

  if (!data) return null

  const role: string = data.role

  if (role === 'superadmin') {
    const headersList = await headers()
    const impersonatedId = headersList.get('x-effective-school-id')

    return {
      role,
      schoolId: impersonatedId ?? null,
      isImpersonating: !!impersonatedId,
    }
  }

  return {
    role,
    schoolId: (data.school_id as string) ?? null,
    isImpersonating: false,
  }
}

/**
 * When a superadmin is browsing a school (impersonation cookie set),
 * treat them as 'admin' for page-level access checks and UI rendering.
 * For all other roles, returns the role unchanged.
 *
 * Usage: call after reading role from user_roles in any school page.
 */
export async function resolveEffectiveRole(realRole: string): Promise<string> {
  if (realRole !== 'superadmin') return realRole
  const headersList = await headers()
  const impersonatedId = headersList.get('x-effective-school-id')
  return impersonatedId ? 'admin' : realRole
}
