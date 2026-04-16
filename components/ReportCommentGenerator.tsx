'use client'

import { useEffect, useRef, useState } from 'react'

type SubjectGrade = {
  subject: string
  overall: number
  letter: string
}

type ReportCommentGeneratorProps = {
  studentName: string
  className: string | number
  subjectGrades: SubjectGrade[]
  attendancePct: number
  presentCount: number
  absentCount: number
  totalDays: number
  initialComment?: string
  generateLabel?: string
  showHeader?: boolean
}

export default function ReportCommentGenerator({
  studentName,
  className,
  subjectGrades,
  attendancePct,
  presentCount,
  absentCount,
  totalDays,
  initialComment = '',
  generateLabel = 'Generate comment',
  showHeader = true,
}: ReportCommentGeneratorProps) {
  const [comment, setComment] = useState(initialComment)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edited, setEdited] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setComment(initialComment)
    setEdited(false)
    setCopied(false)
  }, [initialComment])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, 112)}px`
  }, [comment])

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/report-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName,
          className,
          subjectGrades,
          attendancePct,
          presentCount,
          absentCount,
          totalDays,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error ?? data?.message ?? 'Failed to generate comment')
        return
      }

      setComment(data.comment ?? '')
      setEdited(false)
    } catch {
      setError('Failed to generate comment')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!comment) return
    try {
      await navigator.clipboard.writeText(comment)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Failed to copy comment')
    }
  }

  return (
    <div className={showHeader ? 'px-5 py-4 border-b border-gray-50' : ''}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {showHeader ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">
                Report Card Comment
              </h3>
              {edited && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
                  Edited
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate a concise draft comment from the student&apos;s results.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {edited && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
                Edited
              </span>
            )}
            {copied && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-100">
                Copied
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {comment && (
            <button
              onClick={handleCopy}
              className="shrink-0 border border-gray-200 bg-white hover:border-gray-300 text-gray-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
            >
              Copy
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="shrink-0 bg-[#1a2e1a] hover:bg-[#243824] active:scale-[0.98] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
          >
            {loading ? 'Generating...' : generateLabel}
          </button>
        </div>
      </div>

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

      {comment && (
        <div className="mt-4">
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value)
              setEdited(true)
            }}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
          />
          <div className="mt-2 text-xs text-gray-500">
            You can edit this comment before saving or printing
          </div>
        </div>
      )}
    </div>
  )
}
