'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type SubmitQuizResult = { success: boolean; error?: string }

export async function submitQuiz(
  quizId: string,
  answers: (number | null)[],
  score: number
): Promise<SubmitQuizResult> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id, school_id')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'student' || !roleData.student_id) {
    return { success: false, error: 'Only students can submit quizzes' }
  }

  const { data: student } = await supabase
    .from('students')
    .select('id, class_num, school_id, is_active')
    .eq('id', roleData.student_id)
    .single()

  if (!student || student.is_active === false) {
    return { success: false, error: 'Student record not found' }
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, status, class_num, max_attempts, school_id')
    .eq('id', quizId)
    .single()

  if (!quiz) return { success: false, error: 'Quiz not found' }
  if (quiz.status !== 'active') {
    return { success: false, error: 'Quiz is not active' }
  }

  const sameSchool =
    !quiz.school_id ||
    !student.school_id ||
    quiz.school_id === student.school_id

  const allowedClass =
    quiz.class_num == null ||
    Number(quiz.class_num) === Number(student.class_num)

  if (!sameSchool || !allowedClass) {
    return { success: false, error: 'You are not allowed to take this quiz' }
  }

  const maxAttempts: number = quiz.max_attempts ?? 1

  const { count } = await admin
    .from('quiz_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)

  const attemptNumber = (count ?? 0) + 1

  if (attemptNumber > maxAttempts) {
    return { success: false, error: 'No attempts remaining' }
  }

  const { error } = await admin.from('quiz_submissions').insert({
    quiz_id: quizId,
    user_id: user.id,
    school_id: student.school_id,
    answers,
    score,
    submitted_at: new Date().toISOString(),
    attempt_number: attemptNumber,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/quizzes/${quizId}`)
  revalidatePath('/quizzes')
  return { success: true }
}
