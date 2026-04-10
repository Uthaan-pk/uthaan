'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Question = {
  text: string
  options: [string, string, string, string]
  correct: number
}

type InitialData = {
  title: string
  subject: string
  timeLimit: string
  status: 'active' | 'inactive' | 'draft'
  questions: Question[]
  classNum: number | null
  maxAttempts: number
}

function emptyQuestion(): Question {
  return { text: '', options: ['', '', '', ''], correct: 0 }
}

const optionLabels = ['A', 'B', 'C', 'D']

const FALLBACK_SUBJECTS = [
  'math',
  'english',
  'urdu',
  'science',
  'islamiat',
  'computer',
  'history',
  'geography',
  'pe',
]

export default function QuizCreateForm({
  userId,
  schoolId,
  quizId,
  initialData,
  visibleSubjects = [],
}: {
  userId: string
  schoolId?: string | null
  quizId?: string
  initialData?: InitialData
  visibleSubjects?: string[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const isEditing = !!quizId
  const subjectOptions =
    visibleSubjects.length > 0 ? visibleSubjects : FALLBACK_SUBJECTS

  const initialSubject =
    initialData?.subject && subjectOptions.includes(initialData.subject.toLowerCase())
      ? initialData.subject.toLowerCase()
      : subjectOptions[0] ?? ''

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [subject, setSubject] = useState(initialSubject)
  const [timeLimit, setTimeLimit] = useState(initialData?.timeLimit ?? '30')
  const [status, setStatus] = useState<'active' | 'inactive' | 'draft'>(
    initialData?.status ?? 'draft'
  )
  const [classNum, setClassNum] = useState<string>(
    initialData?.classNum != null ? String(initialData.classNum) : 'all'
  )
  const [maxAttempts, setMaxAttempts] = useState(
    String(initialData?.maxAttempts ?? 1)
  )
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions ?? [emptyQuestion()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addQuestion() {
    setQuestions(prev => [...prev, emptyQuestion()])
  }

  function removeQuestion(index: number) {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  function updateQuestionText(index: number, text: string) {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, text } : q))
    )
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    setQuestions(prev =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = [...q.options] as [string, string, string, string]
        options[optIndex] = value
        return { ...q, options }
      })
    )
  }

  function updateCorrect(qIndex: number, correct: number) {
    setQuestions(prev =>
      prev.map((q, i) => (i === qIndex ? { ...q, correct } : q))
    )
  }

  function validate(): string | null {
    if (!title.trim()) return 'Quiz title is required.'
    if (!subject.trim()) return 'Subject is required.'
    if (
      visibleSubjects.length > 0 &&
      !visibleSubjects.includes(subject.toLowerCase())
    ) {
      return 'You can only create quizzes for your assigned subjects.'
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Question ${i + 1} text is required.`
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          return `Question ${i + 1}, option ${optionLabels[j]} is required.`
        }
      }
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const dbQuestions = questions.map(q => ({
      text: q.text,
      options: {
        A: q.options[0],
        B: q.options[1],
        C: q.options[2],
        D: q.options[3],
      },
      correct: optionLabels[q.correct],
    }))

    const classNumValue = classNum === 'all' ? null : parseInt(classNum, 10)
    const maxAttemptsValue = parseInt(maxAttempts, 10) || 1

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({
          title: title.trim(),
          subject: subject.trim(),
          time_limit: parseInt(timeLimit, 10) || 30,
          questions: dbQuestions,
          status,
          class_num: classNumValue,
          max_attempts: maxAttemptsValue,
        })
        .eq('id', quizId)

      setSaving(false)

      if (updateError) {
        setError(updateError.message)
        return
      }

      toast.success('Quiz updated!')
      router.push('/quizzes')
    } else {
      const { error: insertError } = await supabase.from('quizzes').insert({
        title: title.trim(),
        subject: subject.trim(),
        time_limit: parseInt(timeLimit, 10) || 30,
        questions: dbQuestions,
        status,
        class_num: classNumValue,
        max_attempts: maxAttemptsValue,
        school_id: schoolId ?? null,
        created_by: userId,
      })

      setSaving(false)

      if (insertError) {
        setError(insertError.message)
        return
      }

      toast.success('Quiz created!')
      router.push('/quizzes')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Quiz details</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 – Cell Biology"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Subject</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
            >
              {subjectOptions.map(sub => (
                <option key={sub} value={sub}>
                  {sub.charAt(0).toUpperCase() + sub.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Time limit (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <select
            value={status}
            onChange={e =>
              setStatus(e.target.value as 'active' | 'inactive' | 'draft')
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Assign to class
            </label>
            <select
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
            >
              <option value="all">All classes</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <option key={n} value={String(n)}>
                  Class {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Max attempts
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxAttempts}
              onChange={e => setMaxAttempts(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Question {qIndex + 1}
              </h3>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Question text
              </label>
              <textarea
                value={q.text}
                onChange={e => updateQuestionText(qIndex, e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Option {optionLabels[optIndex]}
                  </label>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(qIndex, optIndex, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Correct answer
              </label>
              <select
                value={q.correct}
                onChange={e => updateCorrect(qIndex, Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
              >
                {optionLabels.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={addQuestion}
          className="text-xs font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 transition-colors"
        >
          + Add question
        </button>

        <button
          type="submit"
          disabled={saving}
          className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create quiz'}
        </button>
      </div>
    </form>
  )
}
