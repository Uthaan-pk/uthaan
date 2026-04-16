import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { parseBody } from '@/lib/api/validate'

const LinkParentSchema = z.object({
  parent_email: z.string().email().max(254),
  parent_name: z.string().max(150).optional().default(''),
  student_id: z.string().uuid(),
})

const UnlinkSchema = z.object({
  link_id: z.string().uuid(),
})

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') {
    return {
      error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(LinkParentSchema, raw)
  if ('error' in parsed) return parsed.error
  const { parent_email, parent_name, student_id } = parsed.data

  const adminSupabase = createAdminClient()

  const { data: authUsers, error: usersError } =
    await adminSupabase.auth.admin.listUsers()

  if (usersError) {
    console.error('[link-parent] listUsers', usersError)
    return NextResponse.json(
      { message: 'Failed to look up user accounts' },
      { status: 500 }
    )
  }

  const parentUser = authUsers?.users?.find(
    (u: { email?: string | null }) =>
      (u.email ?? '').trim().toLowerCase() === parent_email
  )

  if (!parentUser) {
    return NextResponse.json(
      {
        message: `No account found for ${parent_email}. Ask them to sign up first.`,
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
        message: `${parent_email} did not select the Parent role when signing up.`,
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
      { message: 'Student not found or inactive.' },
      { status: 404 }
    )
  }

  const { data: existingLinks, error: existingLinksError } = await adminSupabase
    .from('parent_student')
    .select('id, parent_id, student_id')
    .eq('parent_id', parentUser.id)

  if (existingLinksError) {
    console.error('[link-parent] existingLinks', existingLinksError)
    return NextResponse.json(
      { message: 'Failed to check existing links' },
      { status: 500 }
    )
  }

  const exactExisting = (existingLinks ?? []).find(
    (link) => link.student_id === student_id
  )

  if (exactExisting) {
    const { data: updatedLink, error: updateError } = await adminSupabase
      .from('parent_student')
      .update({ parent_name: parent_name || null })
      .eq('id', exactExisting.id)
      .select()
      .single()

    if (updateError) {
      console.error('[link-parent] update', updateError)
      return NextResponse.json(
        { message: 'Failed to update link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      link: updatedLink,
      message: 'Parent is already linked to this student.',
    })
  }

  if ((existingLinks ?? []).length > 0) {
    const { error: deleteOldLinksError } = await adminSupabase
      .from('parent_student')
      .delete()
      .eq('parent_id', parentUser.id)

    if (deleteOldLinksError) {
      console.error('[link-parent] deleteOld', deleteOldLinksError)
      return NextResponse.json(
        { message: 'Failed to remove old links' },
        { status: 500 }
      )
    }
  }

  const { data: link, error: insertError } = await adminSupabase
    .from('parent_student')
    .insert({
      parent_id: parentUser.id,
      student_id,
      parent_email,
      parent_name: parent_name || null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[link-parent] insert', insertError)
    return NextResponse.json(
      { message: 'Failed to link parent' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    link,
    message: 'Parent linked successfully.',
  })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = parseBody(UnlinkSchema, raw)
  if ('error' in parsed) return parsed.error
  const { link_id } = parsed.data

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('parent_student')
    .delete()
    .eq('id', link_id)

  if (error) {
    console.error('[link-parent] delete', error)
    return NextResponse.json(
      { message: 'Failed to remove link' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Parent-student link removed successfully.',
  })
}
