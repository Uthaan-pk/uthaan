'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ComposeNote() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('all')
  const [stage, setStage] = useState('')
  const [classNum, setClassNum] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    const payload: Record<string, string> = { title, body, audience }
    if (audience === 'stage' || audience === 'class') payload.stage = stage
    if (audience === 'class') payload.class_num = classNum
    const { error: err } = await supabase.from('notes').insert(payload)
    setLoading(false)
    if (err) {
      toast.error('Failed to send note. Please try again.')
      return
    }
    toast.success('Note sent!')
    setTitle(''); setBody(''); setAudience('all'); setStage(''); setClassNum('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + Compose note
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">New note</h3>
        <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
      </div>
      <div className="space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your note here..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] resize-none"
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={audience}
            onChange={e => setAudience(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
          >
            <option value="all">All students</option>
            <option value="stage">By stage</option>
            <option value="class">By class</option>
          </select>
          {(audience === 'stage' || audience === 'class') && (
            <input
              value={stage}
              onChange={e => setStage(e.target.value)}
              placeholder="Stage"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          )}
          {audience === 'class' && (
            <input
              value={classNum}
              onChange={e => setClassNum(e.target.value)}
              placeholder="Class"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
            />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !body.trim()}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send note'}
          </button>
        </div>
      </div>
    </div>
  )
}
