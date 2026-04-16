import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'

const OnboardingSchema = z.object({
  school_name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  principal_name: z.string().min(1).max(150),
  admin_email: z.string().email().max(254),
  phone: z.string().min(1).max(30),
  total_students: z.number().int().min(1).max(100_000).optional().nullable(),
  classes: z.number().int().min(1).max(50).optional().nullable(),
  stages: z.string().max(200).optional().nullable(),
  subjects: z.string().max(500).optional().nullable(),
  has_student_emails: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional().nullable(),
})

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(OnboardingSchema, raw)
  if ('error' in parsed) return parsed.error

  const {
    school_name,
    city,
    principal_name,
    admin_email,
    phone,
    total_students,
    classes,
    stages,
    subjects,
    has_student_emails,
    notes,
  } = parsed.data

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('school_signups').insert({
      school_name: school_name.trim(),
      city: city.trim(),
      principal_name: principal_name.trim(),
      admin_email: admin_email.trim().toLowerCase(),
      phone: phone.trim(),
      total_students: total_students ?? null,
      classes: classes ?? null,
      stages: stages ?? null,
      subjects: subjects?.trim() ?? null,
      has_student_emails: has_student_emails ?? false,
      notes: notes?.trim() ?? null,
      status: 'pending',
    })

    if (error) {
      console.error('[onboarding]', error)
      return NextResponse.json({ message: 'Failed to submit signup' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
