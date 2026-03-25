'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function QuizError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen bg-[#f8f7f4] items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-sm font-semibold text-gray-900">Something went wrong</div>
        <div className="text-xs text-gray-400">
          We couldn&apos;t load this quiz. Please try again or go back to the quiz list.
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={unstable_retry}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/quizzes"
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            ← Quizzes
          </Link>
        </div>
      </div>
    </div>
  )
}
