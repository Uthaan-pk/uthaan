'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import AcknowledgeButton from '@/components/announcements/AcknowledgeButton'

type Announcement = {
  id: string
  title: string
  body: string
  priority: string | null
  class_num: number | null
  created_by: string | null
  created_at: string
}

// Kept inside the component — no need to pass as props
const PRIORITY_BADGE: Record<string, string> = {
  important: 'bg-amber-50 text-amber-800 border border-amber-100',
  urgent:    'bg-red-50 text-red-700 border border-red-100',
}

const PRIORITY_LABEL: Record<string, string> = {
  important: 'Important',
  urgent:    'Urgent',
}

export default function AnnouncementList({
  announcements,
  creatorRoleMap,
  currentUserId,
  isStaff,
  currentUserRole,
  acknowledgedIds,
}: {
  announcements: Announcement[]
  creatorRoleMap: Record<string, string>
  currentUserId: string
  isStaff: boolean
  currentUserRole?: string
  /** Set of announcement IDs the current user has already acknowledged (student/parent only) */
  acknowledgedIds?: Set<string>
  // priorityBadge and priorityLabel are no longer needed as props
  priorityBadge?: Record<string, string>
  priorityLabel?: Record<string, string>
}) {
  const supabase = useMemo(() => createClient(), [])
  const router   = useRouter()

  // Batch-fetch acknowledgement counts for all announcements (staff only)
  const [ackMap, setAckMap] = useState<Record<string, { count: number; total: number }>>({})
  useEffect(() => {
    if (!isStaff || announcements.length === 0) return
    const ids = announcements.map(a => a.id).join(',')
    fetch(`/api/announcements/acknowledgements?ids=${ids}`)
      .then(r => r.json())
      .then((data: Record<string, { count: number; total: number }>) => setAckMap(data))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, announcements.map(a => a.id).join(',')])

  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editTitle,    setEditTitle]    = useState('')
  const [editBody,     setEditBody]     = useState('')
  const [editPriority, setEditPriority] = useState('normal')
  const [editClassNum, setEditClassNum] = useState('all')
  const [savingId,     setSavingId]     = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function startEdit(a: Announcement) {
    setEditingId(a.id)
    setEditTitle(a.title ?? '')
    setEditBody(a.body ?? '')
    setEditPriority((a.priority ?? 'normal').toLowerCase())
    setEditClassNum(a.class_num == null ? 'all' : String(a.class_num))
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditBody('')
    setEditPriority('normal')
    setEditClassNum('all')
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error('Title and body are required')
      return
    }
    setSavingId(id)
    const { error } = await supabase
      .from('announcements')
      .update({
        title:     editTitle.trim(),
        body:      editBody.trim(),
        priority:  editPriority.toLowerCase(),
        class_num: editClassNum === 'all' ? null : parseInt(editClassNum, 10),
      })
      .eq('id', id)
    setSavingId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Announcement updated')
    cancelEdit()
    router.refresh()
  }

  async function deleteAnnouncement(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    setDeletingId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Announcement deleted')
    setConfirmDeleteId(null)
    router.refresh()
  }

  if (announcements.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="text-sm font-medium text-gray-900 mb-1">No announcements yet</div>
        <div className="text-xs text-gray-400">
          {isStaff ? 'Post an announcement above to notify students and parents.' : 'Check back later for updates from your school.'}
        </div>
      </div>
    )
  }

  return (
    <>
      {announcements.map(a => {
        const isOwner      = a.created_by === currentUserId
        const isAdmin      = currentUserRole === 'admin'
        const canEdit      = isStaff && isOwner
        const canDelete    = isStaff && (isOwner || isAdmin)
        const isEditing    = editingId === a.id
        const isConfirming = confirmDeleteId === a.id

        return (
          <div key={a.id} className="px-5 py-5 border-b border-gray-50 last:border-0">
            {isEditing ? (
              /* ── Edit form ── */
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Title</label>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Message</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-base text-[#1a2e1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <select
                    value={editClassNum}
                    onChange={e => setEditClassNum(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-base text-[#1a2e1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  >
                    <option value="all">All classes</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>Class {n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={cancelEdit}
                    className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2.5 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(a.id)}
                    disabled={savingId === a.id}
                    className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    {savingId === a.id ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Read view ── */
              <>
                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start xl:gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {a.priority && a.priority !== 'normal' && (
                        <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          PRIORITY_BADGE[a.priority] ?? 'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}>
                          {PRIORITY_LABEL[a.priority] ?? a.priority}
                        </span>
                      )}
                      {a.class_num != null && (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25">
                          Class {a.class_num}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500">
                        {new Date(a.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="mt-3 text-base font-semibold leading-tight text-gray-900">
                      {a.title}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                      {a.body}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 capitalize">
                      Posted by{' '}
                      <span className="font-medium text-gray-700">
                        {creatorRoleMap[a.created_by ?? ''] ?? 'staff'}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 xl:min-w-[220px] xl:items-end">
                    {(canEdit || canDelete) && !isConfirming && (
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {canEdit && (
                          <button
                            onClick={() => startEdit(a)}
                            className="text-xs text-gray-500 hover:text-[#1a2e1a] transition-colors py-1 px-1"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDeleteId(a.id)}
                            className="text-xs text-gray-500 hover:text-red-500 transition-colors py-1 px-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}

                    {isStaff ? (
                      <span className="text-[10px] text-gray-400 xl:text-right">
                        {ackMap[a.id]
                          ? `${ackMap[a.id].count} of ${ackMap[a.id].total} acknowledged`
                          : <span className="text-gray-300">Loading…</span>
                        }
                      </span>
                    ) : (
                      <AcknowledgeButton
                        announcementId={a.id}
                        initialAcknowledged={acknowledgedIds?.has(a.id) ?? false}
                      />
                    )}
                  </div>
                </div>

                {isConfirming && canDelete && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-3 sm:flex-row sm:items-center">
                    <span className="flex-1 text-xs text-red-700">Delete this announcement?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteAnnouncement(a.id)}
                        disabled={deletingId === a.id}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        {deletingId === a.id ? 'Deleting…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </>
  )
}
