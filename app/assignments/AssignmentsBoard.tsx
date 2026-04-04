'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CURRENT_TERM } from '@/lib/constants'
const CATEGORY_OPTIONS = ['assignment', 'quiz', 'exam', 'final'] as const

type Assignment = {
  id: string
  title: string
  description?: string | null
  subject: string
  class_num?: number | null
  due_date: string
  created_by?: string
  created_at?: string
  attachment_url?: string | null
  attachment_name?: string | null
}

type Submission = {
  id: string
  assignment_id: string
  student_id: string
  file_url: string | null
  text_response: string | null
  submitted_at: string
  reviewed: boolean
  reviewed_at: string | null
  teacher_note: string | null
  grade: string | null
  score_percent?: number | null
  category?: string | null
}

type Student = {
  id: string
  name: string
  class_num: number | null
  roll_no: string
}

const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-50 text-blue-700 border-blue-100',
  english: 'bg-purple-50 text-purple-700 border-purple-100',
  urdu: 'bg-orange-50 text-orange-700 border-orange-100',
  science: 'bg-teal-50 text-teal-700 border-teal-100',
  islamiat: 'bg-amber-50 text-amber-700 border-amber-100',
}

function subjectColor(s: string) {
  return SUBJECT_COLORS[s.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-100'
}

function dueInfo(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [year, month, day] = dateStr.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  due.setHours(0, 0, 0, 0)

  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diff < 0) {
    return {
      label: 'Overdue',
      cls: 'bg-red-50 text-red-600 border-red-100',
      border: 'border-l-red-400',
    }
  }
  if (diff === 0) {
    return {
      label: 'Due Today',
      cls: 'bg-amber-50 text-amber-700 border-amber-100',
      border: 'border-l-amber-400',
    }
  }
  if (diff === 1) {
    return {
      label: 'Due Tomorrow',
      cls: 'bg-amber-50 text-amber-600 border-amber-100',
      border: 'border-l-amber-300',
    }
  }
  return {
    label: `Due in ${diff} days`,
    cls: 'bg-green-50 text-green-700 border-green-100',
    border: 'border-l-[#6fcf6f]',
  }
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F', 'Missing', 'Excused']

export default function AssignmentsBoard({
  assignments,
  submissions: initialSubs,
  students,
  currentUserId,
  role,
}: {
  assignments: Assignment[]
  submissions: Submission[]
  students: Student[]
  currentUserId: string
  role: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubs)
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all')
  const [drawerAssignment, setDrawerAssignment] = useState<Assignment | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [posting, setPosting] = useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [newAssign, setNewAssign] = useState({
    title: '',
    description: '',
    subject: 'math',
    class_num: '',
    due_date: '',
  })
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [savingGrade, setSavingGrade] = useState<string | null>(null)

  const classNums = useMemo(() => {
    const nums = [...new Set(assignments.map(a => a.class_num).filter(Boolean))] as number[]
    return nums.sort((a, b) => a - b)
  }, [assignments])

  const filtered = useMemo(() => {
    let list = assignments
    if (selectedClass !== null) list = list.filter(a => a.class_num === selectedClass)
    if (filter === 'pending') {
      list = list.filter(a =>
        submissions.some(s => s.assignment_id === a.id && !s.reviewed)
      )
    }
    if (filter === 'graded') {
      list = list.filter(a =>
        submissions.some(s => s.assignment_id === a.id && s.reviewed)
      )
    }
    return list
  }, [assignments, submissions, selectedClass, filter])

  function submissionsFor(assignId: string) {
    return submissions.filter(s => s.assignment_id === assignId)
  }

  function studentsForClass(classNum: number | null | undefined) {
    return students.filter(s => s.class_num === classNum)
  }

  function resetForm() {
    setShowPostForm(false)
    setEditingAssignmentId(null)
    setRemoveAttachment(false)
    setAttachmentFile(null)
    setNewAssign({
      title: '',
      description: '',
      subject: 'math',
      class_num: '',
      due_date: '',
    })
  }

  function startEditAssignment(a: Assignment) {
    setEditingAssignmentId(a.id)
    setShowPostForm(true)
    setRemoveAttachment(false)
    setAttachmentFile(null)
    setNewAssign({
      title: a.title,
      description: a.description ?? '',
      subject: a.subject,
      class_num: a.class_num ? String(a.class_num) : '',
      due_date: a.due_date,
    })
  }

  async function upsertMarkFromAssignment(params: {
    studentId: string
    assignment: Assignment
    scorePercent: number | null
  }) {
    const { studentId, assignment, scorePercent } = params

    const { error } = await supabase
      .from('marks')
      .upsert(
        {
          student_id: studentId,
          subject: assignment.subject,
          exam: 'assignment',
          score: scorePercent,
          percent: scorePercent,
          term: CURRENT_TERM,
          assignment_id: assignment.id,
          source: 'submission',
        },
        { onConflict: 'student_id,subject,assignment_id' }
      )

    return error
  }

  async function saveGrade(
    sub: Submission,
    grade: string,
    note: string,
    scorePercent: number | null,
    category: string
  ) {
    const assignment = assignments.find(a => a.id === sub.assignment_id)
    if (!assignment) {
      toast.error('Assignment not found')
      return
    }

    if (!category) {
      toast.error('Category is required')
      return
    }

    if (grade !== 'Excused' && (scorePercent === null || isNaN(scorePercent))) {
      toast.error('Score is required')
      return
    }

    const finalScore = grade === 'Excused' ? null : scorePercent

    setSavingGrade(sub.id)

    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        grade,
        teacher_note: note,
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        score_percent: finalScore,
        category,
      })
      .eq('id', sub.id)

    if (error) {
      toast.error(error.message || 'Failed to save')
      setSavingGrade(null)
      return
    }

    const markError = await upsertMarkFromAssignment({
      studentId: sub.student_id,
      assignment,
      scorePercent: finalScore,
    })

    if (markError) {
      toast.error(markError.message || 'Saved submission but failed to sync gradebook')
      setSavingGrade(null)
      return
    }

    setSubmissions(prev =>
      prev.map(s =>
        s.id === sub.id
          ? {
              ...s,
              grade,
              teacher_note: note,
              reviewed: true,
              score_percent: finalScore,
              category,
            }
          : s
      )
    )

    setSavingGrade(null)
    toast.success('Grade saved')
  }

  async function saveGradeForMissingStudent(
    assignmentId: string,
    studentId: string,
    grade: string,
    note: string,
    scorePercent: number | null,
    category: string
  ) {
    const assignment = assignments.find(a => a.id === assignmentId)
    if (!assignment) {
      toast.error('Assignment not found')
      return
    }

    if (!category) {
      toast.error('Category is required')
      return
    }

    if (grade !== 'Excused' && (scorePercent === null || isNaN(scorePercent))) {
      toast.error('Score is required')
      return
    }

    const finalScore = grade === 'Excused' ? null : scorePercent
    const tempKey = `missing-${assignmentId}-${studentId}`
    setSavingGrade(tempKey)

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        file_url: null,
        text_response: null,
        submitted_at: new Date().toISOString(),
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        teacher_note: note || null,
        grade,
        score_percent: finalScore,
        category,
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message || 'Failed to save')
      setSavingGrade(null)
      return
    }

    const markError = await upsertMarkFromAssignment({
      studentId,
      assignment,
      scorePercent: finalScore,
    })

    if (markError) {
      toast.error(markError.message || 'Saved submission but failed to sync gradebook')
      setSavingGrade(null)
      return
    }

    if (data) {
      setSubmissions(prev => [...prev, data as Submission])
    }

    setSavingGrade(null)
    toast.success('Grade saved')
  }

  async function postAssignment() {
    if (!newAssign.title || !newAssign.due_date || !newAssign.class_num) {
      toast.error('Title, class, and due date are required')
      return
    }

    setPosting(true)

    let attachmentUrl: string | null = null
    let attachmentName: string | null = null

    const editingAssignment = editingAssignmentId
      ? assignments.find(a => a.id === editingAssignmentId) ?? null
      : null

    if (editingAssignment) {
      attachmentUrl = editingAssignment.attachment_url ?? null
      attachmentName = editingAssignment.attachment_name ?? null
    }

    if (removeAttachment) {
      attachmentUrl = null
      attachmentName = null
    }

    if (attachmentFile) {
      const safeName = attachmentFile.name.replace(/\s+/g, '-')
      const filePath = `${currentUserId}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('assignment-files')
        .upload(filePath, attachmentFile, { upsert: true })

      if (uploadError) {
        setPosting(false)
        toast.error('Attachment upload failed')
        return
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from('assignment-files')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365)

      if (signedError || !signedData?.signedUrl) {
        setPosting(false)
        toast.error('Could not generate attachment link')
        return
      }

      attachmentUrl = signedData.signedUrl
      attachmentName = attachmentFile.name
    }

    if (editingAssignmentId) {
      const { error } = await supabase
        .from('assignments')
        .update({
          title: newAssign.title,
          description: newAssign.description || null,
          subject: newAssign.subject,
          class_num: parseInt(newAssign.class_num, 10),
          due_date: newAssign.due_date,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .eq('id', editingAssignmentId)

      setPosting(false)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Assignment updated')
      resetForm()
      router.refresh()
      return
    }

    const { error } = await supabase.from('assignments').insert({
      title: newAssign.title,
      description: newAssign.description || null,
      subject: newAssign.subject,
      class_num: parseInt(newAssign.class_num, 10),
      due_date: newAssign.due_date,
      created_by: currentUserId,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    })

    setPosting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Assignment posted')
    resetForm()
    router.refresh()
  }

  async function deleteAssignment(id: string) {
    if (!confirm('Delete this assignment?')) return
    await supabase.from('assignments').delete().eq('id', id)
    toast.success('Deleted')
    router.refresh()
  }

  const drawerStudents = drawerAssignment
    ? studentsForClass(drawerAssignment.class_num)
    : []
  const drawerSubs = drawerAssignment ? submissionsFor(drawerAssignment.id) : []

  const editingAssignment = editingAssignmentId
    ? assignments.find(a => a.id === editingAssignmentId) ?? null
    : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-gray-100 rounded-lg p-1">
          {(['all', 'pending', 'graded'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-[#1a2e1a] text-[#6fcf6f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {classNums.length > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedClass(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedClass === null
                  ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              All classes
            </button>
            {classNums.map(cn => (
              <button
                key={cn}
                onClick={() => setSelectedClass(cn)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedClass === cn
                    ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}
              >
                Class {cn}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            resetForm()
            setShowPostForm(true)
          }}
          className="ml-auto bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Post assignment
        </button>
      </div>

      {showPostForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editingAssignmentId ? 'Edit assignment' : 'New assignment'}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Title *
                </label>
                <input
                  value={newAssign.title}
                  onChange={e =>
                    setNewAssign(p => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Math HW 2"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Subject
                </label>
                <select
                  value={newAssign.subject}
                  onChange={e =>
                    setNewAssign(p => ({ ...p, subject: e.target.value }))
                  }
                  className={inputCls}
                >
                  {[
                    'math',
                    'english',
                    'urdu',
                    'science',
                    'islamiat',
                    'computer',
                    'history',
                    'geography',
                    'pe',
                  ].map(s => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Class *
                </label>
                <input
                  type="number"
                  value={newAssign.class_num}
                  onChange={e =>
                    setNewAssign(p => ({ ...p, class_num: e.target.value }))
                  }
                  placeholder="e.g. 5"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Due date *
                </label>
                <input
                  type="date"
                  value={newAssign.due_date}
                  onChange={e =>
                    setNewAssign(p => ({ ...p, due_date: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={newAssign.description}
                onChange={e =>
                  setNewAssign(p => ({ ...p, description: e.target.value }))
                }
                placeholder="Instructions for students…"
                rows={2}
                className={inputCls}
              />
            </div>

            {editingAssignment?.attachment_url && !removeAttachment && !attachmentFile && (
              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                Current attachment:{' '}
                <a
                  href={editingAssignment.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {editingAssignment.attachment_name ?? 'Open file'}
                </a>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                Attachment
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={e => {
                  const file = e.target.files?.[0] ?? null
                  setAttachmentFile(file)
                  if (file) setRemoveAttachment(false)
                }}
                className="text-xs text-gray-600"
              />
              {attachmentFile && (
                <div className="text-[11px] text-gray-500 mt-1">
                  Selected: {attachmentFile.name}
                </div>
              )}
            </div>

            {editingAssignment?.attachment_url && (
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={removeAttachment}
                  onChange={e => {
                    setRemoveAttachment(e.target.checked)
                    if (e.target.checked) setAttachmentFile(null)
                  }}
                />
                Remove current attachment
              </label>
            )}

            <div className="flex gap-2">
              <button
                onClick={postAssignment}
                disabled={posting}
                className="bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium px-4 py-2.5 rounded-lg disabled:opacity-50"
              >
                {posting
                  ? editingAssignmentId
                    ? 'Saving…'
                    : 'Posting…'
                  : editingAssignmentId
                  ? 'Save changes'
                  : 'Post'}
              </button>
              <button
                onClick={resetForm}
                className="text-xs text-gray-400 hover:text-gray-600 px-4 py-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
          No assignments yet. Post one above.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const due = dueInfo(a.due_date)
            const subs = submissionsFor(a.id)
            const classStudents = studentsForClass(a.class_num)
            const submitted = subs.length
            const graded = subs.filter(s => s.reviewed).length

            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl border border-l-4 ${due.border} border-gray-100 p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${subjectColor(a.subject)}`}
                      >
                        {a.subject.charAt(0).toUpperCase() + a.subject.slice(1)}
                      </span>
                      {a.class_num && (
                        <span className="text-[11px] text-gray-400">
                          Class {a.class_num}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${due.cls}`}
                      >
                        {due.label}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-gray-900">
                      {a.title}
                    </div>

                    {a.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {a.description}
                      </div>
                    )}

                    {a.attachment_url && (
                      <div className="mt-2">
                        <a
                          href={a.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Attachment: {a.attachment_name ?? 'Open file'} →
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6fcf6f] rounded-full transition-all"
                          style={{
                            width:
                              classStudents.length > 0
                                ? `${(submitted / classStudents.length) * 100}%`
                                : '0%',
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">
                        {submitted}/{classStudents.length} submitted · {graded}{' '}
                        graded
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setDrawerAssignment(a)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f]"
                    >
                      View submissions
                    </button>
                    <button
                      onClick={() => startEditAssignment(a)}
                      className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-100 bg-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAssignment(a.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg border border-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {drawerAssignment && (
        <>
          <div
            className="fixed inset-0 bg-black/25 z-40"
            onClick={() => setDrawerAssignment(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {drawerAssignment.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Class {drawerAssignment.class_num} · {drawerAssignment.subject}
                </div>
                {drawerAssignment.attachment_url && (
                  <a
                    href={drawerAssignment.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Open attachment: {drawerAssignment.attachment_name ?? 'File'} →
                  </a>
                )}
              </div>
              <button
                onClick={() => setDrawerAssignment(null)}
                className="text-gray-300 hover:text-gray-500 text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {drawerStudents.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-10">
                  No students in this class
                </div>
              ) : (
                drawerStudents.map(student => {
                  const sub = drawerSubs.find(s => s.student_id === student.id)
                  return (
                    <StudentSubmissionRow
                      key={student.id}
                      student={student}
                      submission={sub ?? null}
                      assignmentId={drawerAssignment.id}
                      saving={
                        savingGrade ===
                        (sub?.id ?? `missing-${drawerAssignment.id}-${student.id}`)
                      }
                      onSave={saveGrade}
                      onSaveMissing={saveGradeForMissingStudent}
                    />
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StudentSubmissionRow({
  student,
  submission,
  assignmentId,
  saving,
  onSave,
  onSaveMissing,
}: {
  student: Student
  submission: Submission | null
  assignmentId: string
  saving: boolean
  onSave: (
    sub: Submission,
    grade: string,
    note: string,
    scorePercent: number | null,
    category: string
  ) => void
  onSaveMissing: (
    assignmentId: string,
    studentId: string,
    grade: string,
    note: string,
    scorePercent: number | null,
    category: string
  ) => void
}) {
  const [grade, setGrade] = useState(submission?.grade ?? '')
  const [note, setNote] = useState(submission?.teacher_note ?? '')
  const [score, setScore] = useState(
    submission?.score_percent != null ? String(submission.score_percent) : ''
  )
  const [category, setCategory] = useState(submission?.category ?? 'assignment')
  const [expanded, setExpanded] = useState(false)

  const parsedScore = score.trim() === '' ? null : Number(score)

  if (!submission) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[11px] font-semibold">
            {student.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{student.name}</div>
            <div className="text-xs text-gray-400">{student.roll_no}</div>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            Not submitted
          </span>
          <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-white/60">
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Grade / status
                </div>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
                >
                  <option value="">Select…</option>
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Score %
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder={grade === 'Excused' ? 'Optional' : 'e.g. 85'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
                />
              </div>

              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Category
                </div>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                  Note
                </div>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional feedback…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
                />
              </div>
            </div>

            <button
              onClick={() =>
                onSaveMissing(assignmentId, student.id, grade, note, parsedScore, category)
              }
              disabled={saving || !grade}
              className="w-full bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save grade'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border transition-colors ${
        submission.reviewed
          ? 'border-green-100 bg-green-50/30'
          : 'border-amber-100 bg-amber-50/30'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold ${
            submission.reviewed
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {student.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>

        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{student.name}</div>
          <div className="text-xs text-gray-400">
            {new Date(submission.submitted_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {submission.grade && (
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              {submission.grade}
            </span>
          )}
          {submission.score_percent != null && (
            <span className="text-[11px] text-gray-500">{submission.score_percent}%</span>
          )}
          <span
            className={`text-[11px] font-medium ${
              submission.reviewed ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {submission.reviewed ? 'Graded ✓' : 'Submitted'}
          </span>
          <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/60">
          {submission.text_response && (
            <div className="mt-3">
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Response
              </div>
              <div className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                {submission.text_response}
              </div>
            </div>
          )}

          {submission.file_url && (
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                File
              </div>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View uploaded file →
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Grade
              </div>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
              >
                <option value="">Select…</option>
                {GRADE_OPTIONS.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Score %
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder={grade === 'Excused' ? 'Optional' : 'e.g. 85'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
              />
            </div>

            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Category
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Note
              </div>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional feedback…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40"
              />
            </div>
          </div>

          <button
            onClick={() =>
              submission && onSave(submission, grade, note, parsedScore, category)
            }
            disabled={saving || !grade}
            className="w-full bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save grade'}
          </button>
        </div>
      )}
    </div>
  )
}