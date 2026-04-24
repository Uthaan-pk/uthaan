'use server'

import { createClient } from '@/lib/supabase/server'

export type DemoRequestState = {
  error: string | null
  success: boolean
}

const REQUESTED_PLANS = ['not_sure', 'starter', 'growth', 'pro', 'enterprise'] as const
type RequestedPlan = (typeof REQUESTED_PLANS)[number]

function clean(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitDemoRequest(
  _prevState: DemoRequestState,
  formData: FormData
): Promise<DemoRequestState> {
  const schoolName = clean(formData.get('school_name'))
  const contactName = clean(formData.get('contact_name'))
  const roleTitle = clean(formData.get('role_title'))
  const email = clean(formData.get('email')).toLowerCase()
  const phone = clean(formData.get('phone'))
  const city = clean(formData.get('city'))
  const studentCountRaw = clean(formData.get('student_count'))
  const message = clean(formData.get('message'))
  const requestedPlanRaw = clean(formData.get('requested_plan'))
  const website = clean(formData.get('website'))
  const requestedPlan: RequestedPlan = REQUESTED_PLANS.includes(requestedPlanRaw as RequestedPlan)
    ? (requestedPlanRaw as RequestedPlan)
    : 'not_sure'

  if (website) {
    return { error: null, success: true }
  }

  if (!schoolName || !contactName || !email) {
    return {
      error: 'School name, contact name, and email are required.',
      success: false,
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    return {
      error: 'Please enter a valid email address.',
      success: false,
    }
  }

  let studentCount: number | null = null
  if (studentCountRaw) {
    const parsed = Number.parseInt(studentCountRaw, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      return {
        error: 'Student count must be a valid positive number.',
        success: false,
      }
    }
    studentCount = parsed
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('demo_requests').insert({
      school_name: schoolName,
      contact_name: contactName,
      role_title: roleTitle || null,
      email,
      phone: phone || null,
      city: city || null,
      student_count: studentCount,
      message: message || null,
      requested_plan: requestedPlan,
    })

    if (error) {
      console.error('Demo request insert failed', {
        message: error.message,
        code: error.code,
        details: error.details,
      })
      return {
        error: 'Could not save your request right now. Please try again.',
        success: false,
      }
    }
  } catch (error) {
    console.error('Demo request submit crashed', error)
    return {
      error: 'Something went wrong while submitting your request. Please try again.',
      success: false,
    }
  }

  return { error: null, success: true }
}
