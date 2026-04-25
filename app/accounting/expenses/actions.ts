'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ALLOWED_ROLES = ['accountant', 'admin']

const ALLOWED_CATEGORIES = [
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

export async function createExpense(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
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

  if (!roleData?.school_id || !ALLOWED_ROLES.includes(roleData.role)) {
    return { error: 'Forbidden.' }
  }

  const title = String(formData.get('title') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const rawAmount = String(formData.get('amount') ?? '')
  const amount = parseFloat(rawAmount)
  const expense_date = String(
    formData.get('expense_date') ?? new Date().toISOString().split('T')[0],
  )
  const vendor = String(formData.get('vendor') ?? '').trim() || null
  const description = String(formData.get('description') ?? '').trim() || null

  if (!title) return { error: 'Title is required.' }
  if (!ALLOWED_CATEGORIES.includes(category)) return { error: 'Invalid category.' }
  if (isNaN(amount) || amount < 0) return { error: 'Enter a valid positive amount.' }
  if (!expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(expense_date))
    return { error: 'Enter a valid date.' }

  const { error } = await supabase.from('petty_expenses').insert({
    school_id: roleData.school_id,
    created_by: user.id,
    title,
    category,
    amount,
    expense_date,
    vendor,
    description,
    status: 'pending_approval',
  })

  if (error) return { error: error.message }

  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting')
  revalidatePath('/admin/expenses/approvals')
  revalidatePath('/dashboard')
  return { success: true }
}
