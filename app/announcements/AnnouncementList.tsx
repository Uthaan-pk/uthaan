'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type Announcement = {
  id: string
  title: string
  body: string
  priority: string | null
  class_num: number | null
  created_by: string | null
  created_at: string
}

export default function AnnouncementList({
  announcements,
  creatorRoleMap,
  currentUserId,
  isStaff,
  priorityBadge,
  priorityLabel,
}: {
  announcements: Announcement[]
  creatorRoleMap: Record<string, string>
  currentUserId: string
  isStaff: boolean
  priorityBadge: Record<string, string>
  priorityLabel: Record<string, string>
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editPriority, setEditPriority] = useState('normal')
  const [editClassNum, setEditClassNum] = useState('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(a: Announcement) {
    setEditingId(a.id)
    setEditTitle(a.title ?? '')
    setEditBody(a.body ?? '')
    setEditPriority((a.priority ?? 'normal').toLowerCase())
    setEditClassNum(a.class_num == null ? 'all' : String(a.class_num))
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
        title: editTitle.trim(),
        body: editBody.trim(),
        priority: editPriority.toLowerCase(),
        class_num: editClassNum === 'all' ? null : parseInt(editClassNum, 10),
      })
      .eq('id', id)

    setSavingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Announcement updated')
    cancelEdit()
    router.refresh()
  }

  async function deleteAnnouncement(id: string) {
    const confirmed = window.confirm(
      'Delete this announcement? This cannot be undone.'
    )
    if (!confirmed) return

    setDeletingId(id)

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    setDeletingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Announcement deleted')
    router.refresh()
  }

  if (announcements.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-400">
        No announcements yet
      </div>
    )
  }

  return (
    <>
      {announcements.map(a => {
        const canManage = isStaff && a.created_by === currentUserId
        const isEditing = editingId === a.id

        return (
          <div
            key={a.id}
            className="px-5 py-4 border-b border-gray-50 last:border-0"
          >
            {isEditing ? (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                />

                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
                />

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1a2e1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <select
                    value={editClassNum}
                    onChange={e => setEditClassNum(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1a2e1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
                  >
                    <option value="all">All classes</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>
                        Class {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(a.id)}
                    disabled={savingId === a.id}
                    className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {savingId === a.id ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {a.priority !== 'normal' && (
                      <span
                        className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          priorityBadge[a.priority ?? ''] ??
                          'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {priorityLabel[a.priority ?? ''] ?? a.priority}
                      </span>
                    )}

                    {a.class_num != null && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25">
                        Class {a.class_num}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-gray-300">
                      {new Date(a.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(a)}
                          className="text-[11px] text-gray-400 hover:text-[#1a2e1a] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAnnouncement(a.id)}
                          disabled={deletingId === a.id}
                          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingId === a.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm font-medium text-gray-900">
                  {a.title}
                </div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {a.body}
                </div>
                <div className="text-[10px] text-gray-300 mt-2 capitalize">
                  Posted by {creatorRoleMap[a.created_by ?? ''] ?? 'staff'}
                </div>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}