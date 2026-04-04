'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ComposeAnnouncement({ userId }: { userId: string }) {
  const [open,      setOpen]     = useState(false)
  const [title,     setTitle]    = useState('')
  const [body,      setBody]     = useState('')
  const [priority,  setPriority] = useState('normal')
  const [classNum,  setClassNum] = useState('all')
  const [loading,   setLoading]  = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const router   = useRouter()

  function reset() {
    setTitle('')
    setBody('')
    setPriority('normal')
    setClassNum('all')
    setOpen(false)
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return

    setLoading(true)
    const { error } = await supabase.from('announcements').insert({
      title:     title.trim(),
      body:      body.trim(),
      priority:  priority.toLowerCase(),
      class_num: classNum === 'all' ? null : parseInt(classNum, 10),
      created_by: userId,
    })
    setLoading(false)

    if (error) { toast.error(error.message); return }

    toast.success('Announcement posted!')
    reset()
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 w-full sm:w-auto bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-3 rounded-lg transition-colors min-h-[44px]"
      >
        + New announcement
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">New announcement</h3>
        <button
          onClick={reset}
          aria-label="Close"
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="2" y1="2" x2="14" y2="14" />
            <line x1="14" y1="2" x2="2" y2="14" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Message
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your announcement here…"
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Audience
            </label>
            <select
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white"
            >
              <option value="all">All classes</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <option key={n} value={String(n)}>Class {n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2.5 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !body.trim()}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {loading ? 'Posting…' : 'Post announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}
