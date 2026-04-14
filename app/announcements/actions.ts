'use server'

import { createClient } from '@/lib/supabase/server'
import { getSchoolContext, resolveEffectiveRole } from '@/lib/school'

type CreateAnnouncementInput = {
  title: string
  body: string
  priority: string
  classNum: string
}

type CreateAnnouncementResult = {
  error?: string
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<CreateAnnouncementResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const schoolContext = await getSchoolContext(supabase, user.id)
  const effectiveRole = await resolveEffectiveRole(schoolContext?.role ?? '')

  if (!['teacher', 'admin'].includes(effectiveRole)) {
    return { error: 'You are not allowed to post announcements.' }
  }

  if (!schoolContext?.schoolId) {
    return { error: 'No school context found for this announcement.' }
  }

  const title = input.title.trim()
  const body = input.body.trim()

  if (!title || !body) {
    return { error: 'Title and message are required.' }
  }

  const { error } = await supabase.from('announcements').insert({
    title,
    body,
    priority: input.priority.toLowerCase(),
    class_num: input.classNum === 'all' ? null : parseInt(input.classNum, 10),
    school_id: schoolContext.schoolId,
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}
