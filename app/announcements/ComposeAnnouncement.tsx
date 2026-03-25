'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ComposeAnnouncement({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('announcements').insert({
      title,
      body,
      priority,
      created_by: userId,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved(true)
    setTitle('')
    setBody('')
    setPriority('normal')
    router.refresh()
    setTimeout(() => { setSaved(false); setOpen(false) }, 1500)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + New announcement
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">New announcement</h3>
        <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
      </div>
      <div className="space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your announcement here..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
        />
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
        >
          <option value="normal">Normal</option>
          <option value="important">Important</option>
          <option value="urgent">Urgent</option>
        </select>
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !body.trim()}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saved ? 'Posted ✓' : loading ? 'Posting...' : 'Post announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}
