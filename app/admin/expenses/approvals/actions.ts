'use server'

import { createClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function approveExpense(
  id: string,
): Promise<{ error?: string; success?: true }> {
  if (!id) return { error: 'Missing expense ID.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'admin') return { error: 'Forbidden.' }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('petty_expenses')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('school_id', roleData.school_id)

  if (error) return { error: error.message }

  await writeAuditLog(supabase, {
    actor_user_id: user.id,
    action: 'approve_expense',
    entity_type: 'petty_expense',
    entity_id: id,
    new_value: { status: 'approved', approved_at: now },
  })

  revalidatePath('/admin/expenses/approvals')
  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rejectExpense(
  id: string,
  reason: string,
): Promise<{ error?: string; success?: true }> {
  if (!id) return { error: 'Missing expense ID.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'admin') return { error: 'Forbidden.' }

  const rejectionReason = reason.trim() || 'No reason provided.'
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('petty_expenses')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: now,
      rejection_reason: rejectionReason,
      updated_at: now,
    })
    .eq('id', id)
    .eq('school_id', roleData.school_id)

  if (error) return { error: error.message }

  await writeAuditLog(supabase, {
    actor_user_id: user.id,
    action: 'reject_expense',
    entity_type: 'petty_expense',
    entity_id: id,
    new_value: { status: 'rejected', rejection_reason: rejectionReason },
  })

  revalidatePath('/admin/expenses/approvals')
  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting')
  revalidatePath('/dashboard')
  return { success: true }
}
