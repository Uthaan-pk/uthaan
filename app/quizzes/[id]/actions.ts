'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SubmitQuizResult = { success: boolean; error?: string }

export async function submitQuiz(
  quizId: string,
  answers: (number | null)[],
  score: number
): Promise<SubmitQuizResult> {
  const supabase = await createClient()
  const resultsUrl = `/quizzes/${quizId}?mode=results`

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Fetch max_attempts for this quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('max_attempts')
    .eq('id', quizId)
    .single()

  if (!quiz) return { success: false, error: 'Quiz not found' }

  const maxAttempts: number = quiz.max_attempts ?? 1

  // Count existing submissions for this user+quiz
  const { count } = await supabase
    .from('quiz_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)

  if ((count ?? 0) >= maxAttempts) {
    redirect(resultsUrl)
  }

  const { error } = await supabase.from('quiz_submissions').insert({
    quiz_id: quizId,
    user_id: user.id,
    answers,
    score,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/quizzes/${quizId}`)
  revalidatePath('/quizzes')
  redirect(resultsUrl)
}
