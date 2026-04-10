'use client'

import QuizTaker from './QuizTaker'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type Quiz = {
  id: string
  title: string
  subject: string
  time_limit: number
  questions: Question[]
}

export default function QuizAttemptManager({
  quiz,
  userId,
  initialAttemptNumber,
  maxAttempts,
}: {
  quiz: Quiz
  userId: string
  initialAttemptNumber: number
  maxAttempts: number
}) {
  return (
    <QuizTaker
      quiz={quiz}
      userId={userId}
      attemptNumber={initialAttemptNumber}
      maxAttempts={maxAttempts}
    />
  )
}
