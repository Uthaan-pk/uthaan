'use client'

import { useState } from 'react'
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
  const [attemptNumber, setAttemptNumber] = useState(initialAttemptNumber)
  const [retryKey, setRetryKey] = useState(0)

  function handleRetry() {
    setRetryKey((k) => k + 1)
    setAttemptNumber((n) => n + 1)
  }

  return (
    <QuizTaker
      key={retryKey}
      quiz={quiz}
      userId={userId}
      attemptNumber={attemptNumber}
      maxAttempts={maxAttempts}
      onRetry={handleRetry}
    />
  )
}
