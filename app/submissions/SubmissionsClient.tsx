'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Assignment = {
  id: string
  title: string
  subject: string
  class_num?: number | null
  due_date: string
  description?: string | null
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
  student?: { name: string; class_num: number | null } | null
}

type StudentRecord = {
  id: string
  name: string
  class_num: number | null
}

type View = 'student' | 'teacher' | 'admin'
type SubStatus = 'not_submitted' | 'submitted' | 'reviewed'
type ReviewFilter = 'all' | 'reviewed' | 'not_reviewed'

function subStatus(sub: Submission | undefined): SubStatus {
  if (!sub) return 'not_submitted'
  return sub.reviewed ? 'reviewed' : 'submitted'
}

const BADGE: Record<SubStatus, string> = {
  not_submitted: 'bg-gray-50 text-gray-500 border-gray-100',
  submitted:     'bg-yellow-50 text-yellow-700 border-yellow-100',
  reviewed:      'bg-green-50 text-green-700 border-green-100',
}

const LABEL: Record<SubStatus, string> = {
  not_submitted: 'Not Submitted',
  submitted:     'Submitted',
  reviewed:      'Reviewed',
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const labelCls = 'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

export default function SubmissionsClient({
  view,
  studentId,
  assignments,
  submissions: initialSubmissions,
}: {
  view: View
  studentId: string
  assignments: Assignment[]
  submissions: Submission[]
  allStudents: StudentRecord[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Student modal state ───────────────────────────────────────────────────
  const [modalAssignmentId, setModalAssignmentId] = useState<string | null>(null)
  const [turnInType, setTurnInType] = useState<'text' | 'file'>('text')
  const [textResponse, setTextResponse] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadPhase, setUploadPhase] = useState<null | 'uploading' | 'saving'>(null)

  // ── Teacher / admin state ─────────────────────────────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState(assignments[0]?.id ?? '')
  const [filterReview, setFilterReview] = useState<ReviewFilter>('all')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [actingReview, setActingReview] = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  // Student: map assignment_id → their one submission
  const subMap = useMemo(() => {
    const m: Record<string, Submission> = {}
    if (view === 'student') {
      submissions.forEach(s => { m[s.assignment_id] = s })
    }
    return m
  }, [submissions, view])

  // Staff: submissions for the selected assignment
  const assignmentSubs = useMemo(
    () => submissions.filter(s => s.assignment_id === selectedAssignment),
    [submissions, selectedAssignment]
  )

  const filteredSubs = useMemo(() => {
    if (filterReview === 'reviewed')     return assignmentSubs.filter(s => s.reviewed)
    if (filterReview === 'not_reviewed') return assignmentSubs.filter(s => !s.reviewed)
    return assignmentSubs
  }, [assignmentSubs, filterReview])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openModal(assignmentId: string) {
    setModalAssignmentId(assignmentId)
    setTurnInType('text')
    setTextResponse('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function closeModal() {
    setModalAssignmentId(null)
    setTextResponse('')
    setFile(null)
    setUploadPhase(null)
  }

  async function handleTurnIn() {
    if (!modalAssignmentId) return
    if (turnInType === 'text' && !textResponse.trim()) {
      toast.error('Response cannot be empty.')
      return
    }
    if (turnInType === 'file' && !file) {
      toast.error('Please select a file.')
      return
    }

    setUploadPhase('uploading')
    let fileUrl: string | null = null

    if (turnInType === 'file' && file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${studentId}/${modalAssignmentId}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) {
        const msg = uploadError.message.toLowerCase()
        const isBucketMissing =
          msg.includes('bucket') ||
          msg.includes('not found') ||
          msg.includes('does not exist') ||
          (uploadError as { statusCode?: string }).statusCode === '404'

        toast.error(
          isBucketMissing
            ? 'File uploads are not configured yet. Contact your school admin.'
            : uploadError.message
        )
        setUploadPhase(null)
        return
      }

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(storagePath)
      fileUrl = urlData.publicUrl
    }

    setUploadPhase('saving')

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: modalAssignmentId,
        student_id: studentId,
        file_url: fileUrl,
        text_response: turnInType === 'text' ? textResponse.trim() : null,
        submitted_at: new Date().toISOString(),
        reviewed: false,
      })
      .select()
      .single()

    setUploadPhase(null)

    if (error) { toast.error(error.message); return }

    setSubmissions(prev => [...prev, data])
    closeModal()
    toast.success('Submitted!')
  }

  async function handleMarkReviewed(sub: Submission) {
    setActingReview(sub.id)
    const note = reviewNotes[sub.id]?.trim() ?? ''
    const reviewedAt = new Date().toISOString()

    const { error } = await supabase
      .from('assignment_submissions')
      .update({ reviewed: true, reviewed_at: reviewedAt, teacher_note: note || null })
      .eq('id', sub.id)

    setActingReview(null)

    if (error) { toast.error(error.message); return }

    setSubmissions(prev =>
      prev.map(s =>
        s.id === sub.id
          ? { ...s, reviewed: true, reviewed_at: reviewedAt, teacher_note: note || null }
          : s
      )
    )
    toast.success('Marked as reviewed.')
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // STUDENT VIEW
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  if (view === 'student') {
    return (
      <div className="max-w-2xl space-y-2">
        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center">
            <div className="text-sm text-gray-400">No assignments yet</div>
            <div className="text-xs text-gray-300 mt-1">Check back when your teacher posts assignments.</div>
          </div>
        ) : (
          assignments.map(a => {
            const sub = subMap[a.id]
            const status = subStatus(sub)
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-100">
                        {a.subject}
                      </span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${BADGE[status]}`}>
                        {LABEL[status]}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{a.title}</div>
                    {a.description && (
                      <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{a.description}</div>
                    )}
                    {status === 'reviewed' && sub?.teacher_note && (
                      <div className="text-[11px] text-[#1a2e1a] bg-[#6fcf6f]/10 border border-[#6fcf6f]/20 rounded-lg px-3 py-1.5 mt-2 leading-relaxed">
                        <span className="font-medium">Teacher: </span>{sub.teacher_note}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-300 mt-1.5">
                      Due {new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {status === 'not_submitted' && (
                      <button
                        onClick={() => openModal(a.id)}
                        className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Turn In
                      </button>
                    )}
                    {status !== 'not_submitted' && (
                      <span className="text-[11px] text-gray-300">
                        {new Date(sub!.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {sub?.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#1a2e1a] hover:underline"
                      >
                        View file
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Turn In Modal */}
        {modalAssignmentId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Turn In — {assignments.find(a => a.id === modalAssignmentId)?.title}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Type toggle */}
                <div className="flex gap-2">
                  {(['text', 'file'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTurnInType(t)}
                      disabled={uploadPhase !== null}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors disabled:pointer-events-none ${
                        turnInType === t
                          ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {t === 'text' ? 'Type Response' : 'Upload File'}
                    </button>
                  ))}
                </div>

                {turnInType === 'text' ? (
                  <div>
                    <label className={labelCls}>Your response</label>
                    <textarea
                      value={textResponse}
                      onChange={e => setTextResponse(e.target.value)}
                      rows={5}
                      placeholder="Write your answer here…"
                      disabled={uploadPhase !== null}
                      className={inputCls + ' resize-none disabled:opacity-50'}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className={labelCls}>File</label>
                    <input
                      ref={fileRef}
                      type="file"
                      disabled={uploadPhase !== null}
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1a2e1a] file:text-[#6fcf6f] hover:file:bg-[#243d24] file:cursor-pointer disabled:opacity-50"
                    />
                    {file && uploadPhase === null && (
                      <p className="text-[11px] text-gray-400 truncate">
                        Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </p>
                    )}
                  </div>
                )}

                {/* Upload progress bar */}
                {uploadPhase !== null && (
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-[#6fcf6f] rounded-full transition-all duration-500 ${
                          uploadPhase === 'uploading' ? 'w-3/4 animate-pulse' : 'w-full'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {uploadPhase === 'uploading' ? 'Uploading file…' : 'Saving submission…'}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2">
                <button
                  onClick={closeModal}
                  disabled={uploadPhase !== null}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTurnIn}
                  disabled={uploadPhase !== null}
                  className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {uploadPhase === 'uploading'
                    ? 'Uploading…'
                    : uploadPhase === 'saving'
                      ? 'Saving…'
                      : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  // TEACHER / ADMIN VIEW
  // ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
  const isTeacher = view === 'teacher'

  return (
    <div className="max-w-4xl space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-52">
          <select
            value={selectedAssignment}
            onChange={e => setSelectedAssignment(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
          >
            {assignments.length === 0 && <option value="">No assignments</option>}
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.title} — {a.subject}{a.class_num != null ? ` (Class ${a.class_num})` : ''}
              </option>
            ))}
          </select>
        </div>

        <select
          value={filterReview}
          onChange={e => setFilterReview(e.target.value as ReviewFilter)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
        >
          <option value="all">All</option>
          <option value="reviewed">Reviewed</option>
          <option value="not_reviewed">Not Reviewed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filteredSubs.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="text-sm text-gray-400">
              {assignments.length === 0
                ? 'No assignments found'
                : filterReview !== 'all'
                  ? 'No submissions matching filter'
                  : 'No submissions yet for this assignment'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Student', 'Submitted At', 'Type', 'Status', ...(isTeacher ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(sub => {
                  const status = subStatus(sub)
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {sub.student?.name ?? '—'}
                        {sub.student?.class_num != null && (
                          <span className="ml-1.5 text-[11px] text-gray-300">Class {sub.student.class_num}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                        {new Date(sub.submitted_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5">
                        {sub.file_url ? (
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#1a2e1a] hover:text-[#6fcf6f] border border-gray-200 hover:border-[#6fcf6f]/40 rounded px-2 py-1 transition-colors whitespace-nowrap"
                          >
                            File ↗
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-500">Text</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${BADGE[status]}`}>
                            {LABEL[status]}
                          </span>
                          {sub.teacher_note && (
                            <span className="text-[11px] text-gray-400 italic max-w-xs truncate">
                              "{sub.teacher_note}"
                            </span>
                          )}
                        </div>
                      </td>

                      {isTeacher && (
                        <td className="px-5 py-3.5">
                          {sub.reviewed ? (
                            <span className="text-[11px] text-gray-300">Done</span>
                          ) : (
                            <div className="flex items-center gap-2 min-w-[220px]">
                              <input
                                type="text"
                                value={reviewNotes[sub.id] ?? ''}
                                onChange={e => setReviewNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                placeholder="Note (optional)"
                                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                              />
                              <button
                                onClick={() => handleMarkReviewed(sub)}
                                disabled={actingReview === sub.id}
                                className="text-[11px] text-[#1a2e1a] hover:text-[#6fcf6f] border border-gray-200 hover:border-[#6fcf6f]/40 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {actingReview === sub.id ? '…' : 'Mark Reviewed'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
