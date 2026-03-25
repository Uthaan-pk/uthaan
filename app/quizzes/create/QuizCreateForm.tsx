'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

function emptyQuestion(): Question {
  return { text: '', options: ['', '', '', ''], correct: 0 }
}

const optionLabels = ['A', 'B', 'C', 'D']

export default function QuizCreateForm({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [status, setStatus] = useState<'draft' | 'active'>('draft')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()])
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateQuestionText(index: number, text: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    )
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = [...q.options] as [string, string, string, string]
        options[optIndex] = value
        return { ...q, options }
      })
    )
  }

  function updateCorrect(qIndex: number, correct: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, correct } : q))
    )
  }

  function validate(): string | null {
    if (!title.trim()) return 'Quiz title is required.'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Question ${i + 1} text is required.`
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) return `Question ${i + 1}, option ${optionLabels[j]} is required.`
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('quizzes').insert({
      title: title.trim(),
      subject: subject.trim(),
      time_limit_minutes: parseInt(timeLimit) || 30,
      questions,
      status,
      created_by: userId,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSaved(true)
    router.push('/quizzes')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Quiz details</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 – Cell Biology"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Time limit (minutes)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, qIndex) => (
          <div key={qIndex} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            {/* Question header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Question {qIndex + 1}
              </span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50"
                >
                  ×
                </button>
              )}
            </div>

            {/* Question text */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Question text</label>
              <textarea
                rows={2}
                value={question.text}
                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                placeholder="Enter your question here..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Answer options</label>
              {question.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-4 flex-shrink-0">
                    {optionLabels[optIndex]}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                    placeholder={`Option ${optionLabels[optIndex]}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  />
                </div>
              ))}
            </div>

            {/* Correct answer */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Correct answer</label>
              <div className="flex gap-3">
                {optionLabels.map((label, optIndex) => (
                  <label
                    key={optIndex}
                    className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      question.correct === optIndex
                        ? 'border-[#6fcf6f] bg-[#6fcf6f]/10 text-[#1a2e1a]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      value={optIndex}
                      checked={question.correct === optIndex}
                      onChange={() => updateCorrect(qIndex, optIndex)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add question button */}
      <button
        type="button"
        onClick={addQuestion}
        className="w-full border border-dashed border-gray-200 rounded-xl py-3 text-xs font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
      >
        + Add question
      </button>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pb-6">
        <button
          type="submit"
          disabled={saving || saved}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? 'Creating...' : saved ? 'Created!' : 'Create quiz'}
        </button>
      </div>
    </form>
  )
}
