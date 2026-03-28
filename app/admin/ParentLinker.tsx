'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type Student = {
  id: string
  name: string
  roll_no: string
  class_num: number
}

type Link = {
  id: string
  parent_id: string
  parent_email: string
  student_name: string
  student_roll: string
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'

export default function ParentLinker({
  students,
  initialLinks,
}: {
  students: Student[]
  initialLinks: Link[]
}) {
  const router = useRouter()
  const [parentEmail, setParentEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [links, setLinks] = useState(initialLinks)

  async function handleLink() {
    if (!parentEmail.trim() || !studentId) {
      toast.error('Parent email and student are required.')
      return
    }

    setSaving(true)

    const res = await fetch('/api/admin/link-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_email: parentEmail.trim(),
        student_id: studentId,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to link parent.')
      return
    }

    toast.success(data.message ?? 'Parent linked successfully!')
    setParentEmail('')
    setStudentId('')
    router.refresh()
  }

  async function handleUnlink(linkId: string) {
    const confirmed = window.confirm(
      'Remove this parent-student link?'
    )
    if (!confirmed) return

    setUnlinking(linkId)

    const res = await fetch('/api/admin/link-parent', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: linkId }),
    })

    const data = await res.json().catch(() => ({}))
    setUnlinking(null)

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to unlink.')
      return
    }

    setLinks(prev => prev.filter(l => l.id !== linkId))
    toast.success(data.message ?? 'Parent unlinked.')
    router.refresh()
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Parent portal
      </h2>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Link parent to student
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Parent email
            </label>
            <input
              value={parentEmail}
              onChange={e => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              type="email"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Student
            </label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — Class {s.class_num} ({s.roll_no})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-[#f8f7f4] px-3 py-2 text-[11px] text-gray-500 mb-3">
          Linking a parent again will replace their old linked student with the
          new one for cleaner pilot behavior.
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleLink}
            disabled={saving}
            className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Linking…' : 'Link parent'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Existing links · {links.length}
          </h3>
        </div>

        {links.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No parent-student links yet
          </div>
        ) : (
          links.map((link, i) => (
            <div
              key={link.id}
              className={`px-5 py-3.5 flex items-center justify-between gap-4 ${
                i < links.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {link.parent_email}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  → {link.student_name}{' '}
                  <span className="text-gray-300">({link.student_roll})</span>
                </div>
              </div>

              <button
                onClick={() => handleUnlink(link.id)}
                disabled={unlinking === link.id}
                className="text-[10px] text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded px-2 py-1 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {unlinking === link.id ? 'Removing…' : 'Unlink'}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}