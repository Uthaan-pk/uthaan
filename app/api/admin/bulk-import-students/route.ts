import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roleData } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { students } = await req.json()
  if (!Array.isArray(students) || students.length === 0)
    return NextResponse.json({ error: 'No students provided' }, { status: 400 })

  let added = 0, skipped = 0, linked = 0
  const errors: string[] = []

  for (const row of students) {
    const { name, roll_no, email, class_num, stage } = row
    if (!name || !roll_no || !class_num) {
      errors.push(`Skipped — missing fields: ${name || '(no name)'}`)
      skipped++
      continue
    }
    const { data: existing } = await supabase
      .from('students').select('id').eq('roll_no', roll_no.trim()).single()
    if (existing) { skipped++; continue }

    const { data: newStudent, error: insertErr } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        roll_no: roll_no.trim(),
        email: email?.trim() || null,
        class_num: parseInt(class_num, 10),
        stage: stage?.trim() || 'matric',
      })
      .select('id').single()

    if (insertErr || !newStudent) {
      errors.push(`Failed to add ${name}: ${insertErr?.message}`)
      skipped++
      continue
    }
    added++

    if (email?.trim()) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const match = users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
      if (match) {
        await supabase.from('user_roles')
          .update({ student_id: newStudent.id })
          .eq('user_id', match.id)
          .eq('role', 'student')
        linked++
      }
    }
  }

  return NextResponse.json({ added, skipped, linked, errors })
}
