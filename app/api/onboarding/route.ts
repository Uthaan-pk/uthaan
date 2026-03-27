import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { school_name, city, principal_name, admin_email, phone, total_students, classes, stages, subjects, has_student_emails, notes } = body

    if (!school_name || !city || !principal_name || !admin_email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('school_signups').insert({
      school_name: school_name.trim(),
      city: city.trim(),
      principal_name: principal_name.trim(),
      admin_email: admin_email.trim().toLowerCase(),
      phone: phone.trim(),
      total_students: total_students || null,
      classes: classes || null,
      stages: stages || null,
      subjects: subjects?.trim() || null,
      has_student_emails: has_student_emails || false,
      notes: notes?.trim() || null,
      status: 'pending',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
