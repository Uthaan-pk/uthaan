import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { parent_email, student_id } = await request.json()

  if (!parent_email || !student_id) {
    return NextResponse.json(
      { error: 'Parent email and student ID are required.' },
      { status: 400 }
    )
  }

  const { data: authUsers, error: usersError } =
    await adminSupabase.auth.admin.listUsers()

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const normalizedEmail = String(parent_email).trim().toLowerCase()

  const parentUser = authUsers?.users?.find(
    (u: { email?: string | null }) =>
      (u.email ?? '').trim().toLowerCase() === normalizedEmail
  )

  if (!parentUser) {
    return NextResponse.json(
      {
        error: `No account found for ${parent_email}. Ask them to sign up first.`,
      },
      { status: 404 }
    )
  }

  const { data: parentRole, error: parentRoleError } = await adminSupabase
    .from('user_roles')
    .select('id')
    .eq('user_id', parentUser.id)
    .eq('role', 'parent')
    .single()

  if (parentRoleError || !parentRole) {
    return NextResponse.json(
      {
        error: `${parent_email} did not select the Parent role when signing up.`,
      },
      { status: 400 }
    )
  }

  const { data: student, error: studentError } = await adminSupabase
    .from('students')
    .select('id, is_active')
    .eq('id', student_id)
    .eq('is_active', true)
    .single()

  if (studentError || !student) {
    return NextResponse.json(
      { error: 'Student not found or inactive.' },
      { status: 404 }
    )
  }

  const { data: existingLinks, error: existingLinksError } = await adminSupabase
    .from('parent_student')
    .select('id, parent_id, student_id')
    .eq('parent_id', parentUser.id)

  if (existingLinksError) {
    return NextResponse.json(
      { error: existingLinksError.message },
      { status: 500 }
    )
  }

  const exactExisting = (existingLinks ?? []).find(
    link => link.student_id === student_id
  )

  if (exactExisting) {
    return NextResponse.json({
      link: exactExisting,
      message: 'Parent is already linked to this student.',
    })
  }

  if ((existingLinks ?? []).length > 0) {
    const { error: deleteOldLinksError } = await adminSupabase
      .from('parent_student')
      .delete()
      .eq('parent_id', parentUser.id)

    if (deleteOldLinksError) {
      return NextResponse.json(
        { error: deleteOldLinksError.message },
        { status: 500 }
      )
    }
  }

  const { data: link, error: insertError } = await adminSupabase
    .from('parent_student')
    .insert({
      parent_id: parentUser.id,
      student_id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    link,
    message: 'Parent linked successfully.',
  })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { link_id } = await request.json()

  if (!link_id) {
    return NextResponse.json(
      { error: 'Link ID is required.' },
      { status: 400 }
    )
  }

  const { error } = await adminSupabase
    .from('parent_student')
    .delete()
    .eq('id', link_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Parent-student link removed successfully.',
  })
}