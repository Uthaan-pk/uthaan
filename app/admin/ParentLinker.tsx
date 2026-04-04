'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type Student = {
  id: string
  name: string
  roll_no: string
  class_num: number | null
}

type Link = {
  id: string
  parent_id: string
  parent_email?: string
  parent_name?: string | null
  student_id?: string
  student_name?: string
  student_roll?: string
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

  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null)
  const [links, setLinks] = useState<Link[]>([])

  const activeStudentIds = useMemo(
    () => new Set(students.map((student) => student.id)),
    [students]
  )

  const activeStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const aClass = a.class_num ?? Number.MAX_SAFE_INTEGER
        const bClass = b.class_num ?? Number.MAX_SAFE_INTEGER

        if (aClass !== bClass) return aClass - bClass
        return a.name.localeCompare(b.name)
      }),
    [students]
  )

  useEffect(() => {
    const cleanedLinks = (initialLinks ?? []).filter((link) => {
      if (!link.student_id) return true
      return activeStudentIds.has(link.student_id)
    })

    setLinks(cleanedLinks)
  }, [initialLinks, activeStudentIds])

  async function handleLink() {
    if (!parentEmail.trim() || !studentId) {
      toast.error('Parent email and student are required.')
      return
    }

    setSaving(true)

    const res = await fetch('/api/admin/link-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        parent_name: parentName.trim(),
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
    setParentName('')
    setParentEmail('')
    setStudentId('')
    router.refresh()
  }

  async function handleUnlink(linkId: string) {
    setConfirmUnlinkId(null)
    setUnlinking(linkId)

    const res = await fetch('/api/admin/link-parent', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ link_id: linkId }),
    })

    const data = await res.json().catch(() => ({}))
    setUnlinking(null)

    if (!res.ok) {
      toast.error(data.error ?? 'Failed to unlink.')
      return
    }

    setLinks((prev) => prev.filter((link) => link.id !== linkId))
    toast.success(data.message ?? 'Parent unlinked.')
    router.refresh()
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">
        Parent portal
      </h2>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Link parent to student
        </h3>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Parent name
            </label>
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Ahmed Khan"
              type="text"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Parent email
            </label>
            <input
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              type="email"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Student
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select student…</option>
              {activeStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — Class {student.class_num ?? '—'} (
                  {student.roll_no})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 rounded-lg bg-[#f8f7f4] px-3 py-2 text-[11px] text-gray-500">
          Only active students appear here. If a parent is linked again, their
          old link is replaced with the new one.
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleLink}
            disabled={saving}
            className="rounded-lg bg-[#1a2e1a] px-4 py-2 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#243d24] disabled:opacity-50"
          >
            {saving ? 'Linking…' : 'Link parent'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-50 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Existing links · {links.length}
          </h3>
        </div>

        {links.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No active parent-student links
          </div>
        ) : (
          links.map((link, i) => (
            <div key={link.id}>
              <div
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  confirmUnlinkId !== link.id && i < links.length - 1
                    ? 'border-b border-gray-50'
                    : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {link.parent_name?.trim()
                      ? link.parent_name
                      : link.parent_email ?? 'Unknown parent'}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {link.parent_name?.trim() && (
                      <span className="mr-1">{link.parent_email ?? '—'} · </span>
                    )}
                    → {link.student_name ?? 'Unknown student'}{' '}
                    <span className="text-gray-300">
                      ({link.student_roll ?? 'No roll number'})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setConfirmUnlinkId(
                      confirmUnlinkId === link.id ? null : link.id
                    )
                  }
                  disabled={unlinking === link.id}
                  className="flex-shrink-0 rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                >
                  {unlinking === link.id ? 'Removing…' : 'Unlink'}
                </button>
              </div>

              {confirmUnlinkId === link.id && (
                <div
                  className={`px-5 py-3 bg-red-50 border-t border-red-100 flex items-center justify-between gap-3 ${
                    i < links.length - 1 ? 'border-b border-red-100' : ''
                  }`}
                >
                  <span className="text-xs text-red-800">
                    Remove link between {link.parent_name ?? link.parent_email} and{' '}
                    {link.student_name}?
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirmUnlinkId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUnlink(link.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}