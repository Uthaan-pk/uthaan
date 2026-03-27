'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Assignment = { id: string; title: string; description?: string | null; subject: string; class_num?: number | null; due_date: string }
type Submission = { id: string; assignment_id: string; submitted_at: string; reviewed: boolean; grade: string | null; text_response?: string | null; file_url?: string | null }

const SUBJECT_COLORS: Record<string, string> = {
  math:'bg-blue-50 text-blue-700 border-blue-100', english:'bg-purple-50 text-purple-700 border-purple-100',
  urdu:'bg-orange-50 text-orange-700 border-orange-100', science:'bg-teal-50 text-teal-700 border-teal-100',
  islamiat:'bg-amber-50 text-amber-700 border-amber-100',
}
function subjectColor(s: string) { return SUBJECT_COLORS[s.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-100' }

function dueInfo(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  const diff = Math.round((due.getTime()-today.getTime())/86400000)
  if (diff < 0) return { label:'Overdue', cls:'bg-red-50 text-red-600 border-red-100', border:'border-l-red-400' }
  if (diff === 0) return { label:'Due Today', cls:'bg-amber-50 text-amber-700 border-amber-100', border:'border-l-amber-400' }
  if (diff === 1) return { label:'Due Tomorrow', cls:'bg-amber-50 text-amber-600 border-amber-100', border:'border-l-amber-300' }
  return { label:`Due in ${diff} days`, cls:'bg-green-50 text-green-700 border-green-100', border:'border-l-[#6fcf6f]' }
}

export default function AssignmentsFeed({ assignments, submissions: initialSubs, studentId, readOnly }: {
  assignments: Assignment[]; submissions: Submission[]; studentId: string; readOnly: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubs)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [activeSubmit, setActiveSubmit] = useState<string | null>(null)
  const [textResponse, setTextResponse] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<'all'|'pending'|'submitted'|'graded'>('all')

  const subMap = useMemo(() => {
    const m: Record<string, Submission> = {}
    submissions.forEach(s => { m[s.assignment_id] = s })
    return m
  }, [submissions])

  const filtered = useMemo(() => {
    if (filter === 'pending') return assignments.filter(a => !subMap[a.id])
    if (filter === 'submitted') return assignments.filter(a => subMap[a.id] && !subMap[a.id].reviewed)
    if (filter === 'graded') return assignments.filter(a => subMap[a.id]?.reviewed)
    return assignments
  }, [assignments, subMap, filter])

  async function submitAssignment(assignId: string) {
    const file = fileRef.current?.files?.[0]
    if (!textResponse.trim() && !file) { toast.error('Add a response or upload a file'); return }
    setSubmitting(assignId)
    let fileUrl: string | null = null
    if (file) {
      const path = `${studentId}/${assignId}/${file.name}`
      const { error: upErr } = await supabase.storage.from('submissions').upload(path, file, { upsert: true })
      if (upErr) { toast.error('File upload failed'); setSubmitting(null); return }
      const { data: urlData } = await supabase.storage.from('submissions').createSignedUrl(path, 60 * 60 * 24 * 365)
      fileUrl = urlData?.signedUrl ?? null
    }
    const { data, error } = await supabase.from('assignment_submissions').upsert({
      assignment_id: assignId, student_id: studentId,
      text_response: textResponse.trim() || null, file_url: fileUrl,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'assignment_id,student_id' }).select().single()
    setSubmitting(null)
    if (error) { toast.error(error.message); return }
    if (data) setSubmissions(prev => { const next = prev.filter(s => s.assignment_id !== assignId); return [...next, data] })
    setActiveSubmit(null)
    setTextResponse('')
    if (fileRef.current) fileRef.current.value = ''
    toast.success('Submitted!')
  }

  if (assignments.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">No assignments posted yet</div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex gap-1 bg-white border border-gray-100 rounded-lg p-1 mb-5 w-fit">
        {(['all','pending','submitted','graded'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-[#1a2e1a] text-[#6fcf6f]' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(a => {
          const sub = subMap[a.id]
          const due = dueInfo(a.due_date)
          const isActive = activeSubmit === a.id
          return (
            <div key={a.id} className={`bg-white rounded-xl border border-l-4 ${due.border} border-gray-100 p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${subjectColor(a.subject)}`}>
                      {a.subject.charAt(0).toUpperCase()+a.subject.slice(1)}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${due.cls}`}>{due.label}</span>
                    {sub?.reviewed && sub.grade && (
                      <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{sub.grade}</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                  {a.description && <div className="text-xs text-gray-400 mt-1">{a.description}</div>}
                  {sub?.reviewed && (
                    <div className="text-[11px] text-green-600 mt-2 font-medium">✓ Graded by teacher</div>
                  )}
                  {sub && !sub.reviewed && (
                    <div className="text-[11px] text-amber-600 mt-2 font-medium">✓ Submitted · Awaiting review</div>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex-shrink-0">
                    {sub ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg font-medium">Submitted ✓</span>
                    ) : (
                      <button onClick={() => setActiveSubmit(isActive ? null : a.id)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f]">
                        {isActive ? 'Cancel' : 'Submit'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {isActive && !sub && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Your response</label>
                    <textarea value={textResponse} onChange={e => setTextResponse(e.target.value)}
                      placeholder="Type your answer here…" rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Or upload a file</label>
                    <input type="file" ref={fileRef} className="text-xs text-gray-600"/>
                  </div>
                  <button onClick={() => submitAssignment(a.id)} disabled={submitting === a.id}
                    className="w-full bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium py-2.5 rounded-lg disabled:opacity-50">
                    {submitting === a.id ? 'Submitting…' : 'Submit assignment'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <input ref={fileRef} type="file" className="hidden"/>
    </div>
  )
}
