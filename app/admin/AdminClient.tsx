'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import ParentLinker from './ParentLinker'

type Student = {
  id: string
  name: string
  roll_no: string
  email: string | null
  class_num: number | null
  stage: string
  is_active?: boolean
}

type ParentLink = {
  id: string
  parent_id: string
  student_id?: string
  parent_email?: string
  parent_name?: string | null
  student_name?: string
  student_roll?: string
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const labelCls =
  'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

const STAGES = ['pre_1', 'matric', 'o_levels']
const STAGE_LABEL: Record<string, string> = {
  pre_1: 'Pre-1',
  matric: 'Matric',
  o_levels: 'O-Levels',
}

export default function AdminClient({
  students: initialStudents,
  parentLinks: initialLinks,
  parentLinkStudents,
}: {
  students: Student[]
  parentLinks: ParentLink[]
  parentLinkStudents: Student[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [tab, setTab] = useState<'students' | 'import' | 'parents'>('students')
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState('')
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    roll_no: '',
    email: '',
    class_num: '',
    stage: 'matric',
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const [csvRows, setCsvRows] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    added: number
    skipped: number
    linked: number
    errors: string[]
  } | null>(null)
  const [csvError, setCsvError] = useState('')

  useEffect(() => {
    if (window.location.hash === '#import-students') {
      setTab('import')
    }
  }, [])

  async function addStudent() {
    if (!form.name || !form.roll_no || !form.class_num) {
      toast.error('Name, roll number and class required')
      return
    }

    setSaving(true)

    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        class_num: parseInt(form.class_num, 10),
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.message || data.error || 'Failed')
      return
    }

    toast.success('Student added')
    setForm({
      name: '',
      roll_no: '',
      email: '',
      class_num: '',
      stage: 'matric',
    })
    setStudents(prev => [...prev, data.student])
    router.refresh()
  }

  async function archiveStudent(id: string) {
    setConfirmArchiveId(null)
    setDeleting(id)

    try {
      const res = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to archive student')
        setDeleting(null)
        return
      }

      setStudents(prev => prev.filter(s => s.id !== id))
      toast.success('Student archived')
      router.refresh()
    } catch {
      toast.error('Failed to archive student')
    }

    setDeleting(null)
  }

  function parseCSV(text: string) {
    const lines = text
      .trim()
      .split('\n')
      .filter(l => l.trim())

    if (lines.length < 2) {
      setCsvError('Need a header row and at least one student row.')
      return
    }

    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))

    const missing = ['name', 'roll_no', 'class_num'].filter(
      r => !headers.includes(r)
    )

    if (missing.length) {
      setCsvError(`Missing columns: ${missing.join(', ')}. Required: name, roll_no, class_num.`)
      return
    }

    const rows = lines
      .slice(1)
      .map(line => {
        const vals = line
          .split(',')
          .map(v => v.trim().replace(/^"|"$/g, ''))

        const row: any = {}
        headers.forEach((h, i) => {
          row[h] = vals[i] || ''
        })
        return row
      })
      .filter(r => r.name)

    if (rows.length === 0) {
      setCsvError('No student rows found. Add at least one row with name, roll_no, and class_num.')
      return
    }

    setCsvError('')
    setCsvRows(rows)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportResult(null)
    setCsvRows([])

    const reader = new FileReader()
    reader.onload = ev => parseCSV(ev.target?.result as string)
    reader.readAsText(file)
  }

  async function runImport() {
    if (!csvRows.length) return

    setImporting(true)

    const res = await fetch('/api/admin/bulk-import-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: csvRows }),
    })

    const data = await res.json()
    setImporting(false)

    if (!res.ok) {
      toast.error(data.message || 'Could not import students')
      return
    }

    setImportResult(data)

    if (data.added > 0) {
      toast.success(`${data.added} students imported!`)

      const { data: updated } = await supabase
        .from('students')
        .select('id, name, roll_no, email, class_num, stage, is_active')
        .eq('is_active', true)
        .order('name')

      if (updated) setStudents(updated)
      router.refresh()
    }

    setCsvRows([])
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const csv =
      'name,roll_no,class_num,stage,email\nAli Khan,STU-001,9,matric,ali@example.com\nSara Ahmed,STU-002,9,matric,sara@example.com'

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'students_template.csv'
    a.click()
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-100 bg-white p-1.5">
        {(
          [
            ['students', 'Students'],
            ['import', 'Bulk Import'],
            ['parents', 'Parent Links'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`uthaan-pill ${tab === key ? 'uthaan-pill-active' : ''} ${
              tab === key
                ? ''
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Add single student
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={labelCls}>Full name *</label>
                <input
                  value={form.name}
                  onChange={e =>
                    setForm(p => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ali Khan"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Roll number *</label>
                <input
                  value={form.roll_no}
                  onChange={e =>
                    setForm(p => ({ ...p, roll_no: e.target.value }))
                  }
                  placeholder="STU-001"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Class number *</label>
                <input
                  type="number"
                  value={form.class_num}
                  onChange={e =>
                    setForm(p => ({ ...p, class_num: e.target.value }))
                  }
                  placeholder="9"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Stage</label>
                <select
                  value={form.stage}
                  onChange={e =>
                    setForm(p => ({ ...p, stage: e.target.value }))
                  }
                  className={inputCls}
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>
                      {STAGE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>
                  Email (auto-links if they&apos;ve signed up)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e =>
                    setForm(p => ({ ...p, email: e.target.value }))
                  }
                  placeholder="student@email.com"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              onClick={addStudent}
              disabled={saving}
              className="mt-4 bg-[#1a2e1a] text-[#6fcf6f] text-xs font-medium px-4 py-3 min-h-[44px] rounded-lg disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add student'}
            </button>
          </div>

          <div
            data-testid="student-list-panel"
            className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-900">
                All students
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {students.length} total
              </span>
            </div>

            <div className="px-5 py-3 border-b border-gray-50">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or roll number…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
              />
            </div>

            {(() => {
              const q = search.trim().toLowerCase()
              const filtered = q
                ? students.filter(
                    s =>
                      s.name.toLowerCase().includes(q) ||
                      s.roll_no.toLowerCase().includes(q)
                  )
                : students

              if (students.length === 0) {
                return (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No students yet. Use Bulk Import to add many at once.
                  </div>
                )
              }

              if (filtered.length === 0) {
                return (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No students match &ldquo;{search}&rdquo;
                  </div>
                )
              }

              return filtered.map((s, i) => (
                <div key={s.id}>
                  <div
                    className={`flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center ${
                      confirmArchiveId !== s.id && i < filtered.length - 1
                        ? 'border-b border-gray-50'
                        : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#6fcf6f]/20 flex items-center justify-center text-[#1a2e1a] text-[10px] font-bold flex-shrink-0">
                      {s.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {s.roll_no} · Class {s.class_num} ·{' '}
                        {STAGE_LABEL[s.stage] ?? s.stage}
                      </div>
                    </div>

                    {s.email && (
                      <div className="text-xs text-gray-400 hidden sm:block truncate max-w-[160px]">
                        {s.email}
                      </div>
                    )}

                    <button
                      onClick={() =>
                        setConfirmArchiveId(
                          confirmArchiveId === s.id ? null : s.id
                        )
                      }
                      disabled={deleting === s.id}
                      className="uthaan-button-secondary text-xs"
                    >
                      {deleting === s.id ? '…' : 'Archive'}
                    </button>
                  </div>

                  {confirmArchiveId === s.id && (
                    <div
                      className={`px-5 py-3 bg-amber-50 border-t border-amber-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                        i < filtered.length - 1 ? 'border-b border-amber-100' : ''
                      }`}
                    >
                      <span className="text-xs text-amber-800">
                        Archive {s.name}? Historical records are kept.
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setConfirmArchiveId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => archiveStudent(s.id)}
                          className="text-xs font-medium text-amber-700 hover:text-red-600 px-2 py-1"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="space-y-5">
          <div id="import-students" className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Bulk import from CSV
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Import students into the current school only. Download the template,
              fill it in Excel or Google Sheets, then upload the CSV here.
            </p>

            <div className="mb-5 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-gray-100 bg-[#f8f7f4] px-4 py-3">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Required columns
                </div>
                <code className="text-xs text-gray-500">
                  name, roll_no, class_num
                </code>
                <div className="text-xs text-gray-400 mt-1">
                  Optional columns: <code>stage</code>, <code>email</code>
                </div>
                <div className="text-xs text-gray-400">
                  stage values: <code>pre_1</code> · <code>matric</code> · <code>o_levels</code>
                </div>
              </div>

              <div className="rounded-xl border border-[#6fcf6f]/20 bg-[#6fcf6f]/5 px-4 py-3">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Sample row
                </div>
                <div className="overflow-x-auto">
                  <code className="whitespace-nowrap text-xs text-gray-600">
                    Ali Khan, STU-001, 9, matric, ali@example.com
                  </code>
                </div>
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-gray-500">
                Use a unique roll number per student. Class numbers should match your school structure
                (for example 1-12). Duplicate roll numbers are skipped safely.
              </div>
              <button
                onClick={downloadTemplate}
                className="min-h-10 flex-shrink-0 text-xs font-medium text-[#1a2e1a] border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Download template
              </button>
            </div>

            <div>
              <label className={labelCls}>Upload your CSV</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1a2e1a] file:text-[#6fcf6f] hover:file:bg-[#243d24] cursor-pointer"
              />
            </div>

            {csvError && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
                {csvError}
              </div>
            )}

            {csvRows.length > 0 && !importResult && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-700">
                    {csvRows.length} students ready to import
                  </div>
                  <div className="text-xs text-gray-400">Showing first 10</div>
                </div>

                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Name', 'Roll No', 'Class', 'Stage', 'Email'].map(
                            h => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {csvRows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {r.roll_no}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {r.class_num}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {r.stage || 'matric'}
                            </td>
                            <td className="px-3 py-2 text-gray-400">
                              {r.email || '—'}
                            </td>
                          </tr>
                        ))}

                        {csvRows.length > 10 && (
                          <tr className="border-t border-gray-50">
                            <td
                              colSpan={5}
                              className="px-3 py-2 text-gray-400 text-center"
                            >
                              …and {csvRows.length - 10} more students
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={runImport}
                  disabled={importing}
                  className="mt-4 w-full bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-3 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {importing
                    ? `Importing ${csvRows.length} students…`
                    : `Import all ${csvRows.length} students`}
                </button>
              </div>
            )}

            {importResult && (
              <div className="mt-5 space-y-3">
                <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-4">
                  <div className="text-sm font-semibold text-green-800 mb-1">
                    Import complete ✓
                  </div>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>{importResult.added} students added</div>
                    {importResult.linked > 0 && (
                      <div>
                        {importResult.linked} auto-linked to existing accounts
                      </div>
                    )}
                    {importResult.skipped > 0 && (
                      <div className="text-gray-500">
                        {importResult.skipped} skipped (already existed)
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setTab('students')}
                      className="min-h-10 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-50"
                    >
                      View roster
                    </button>
                    <Link
                      href="/dashboard"
                      className="min-h-10 rounded-lg border border-green-200 bg-white px-3 py-2 text-center text-xs font-medium text-green-800 hover:bg-green-50"
                    >
                      Back to launch dashboard
                    </Link>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-red-700 mb-2">
                      Some rows had errors:
                    </div>
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-red-600">
                        {e}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setImportResult(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Import another file
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Import tips
            </h3>
            <p className="mb-3 text-xs text-gray-400">
              These are the mistakes that most often slow down a first pilot import.
            </p>
            <div className="space-y-2">
              {[
                'Download the template and open it in Excel or Google Sheets',
                'Fill in your students — one row per student',
                'Save as CSV (File → Download → CSV)',
                'Upload the file here and click Import',
                'Leave email blank if students do not have school email addresses yet',
                'Keep roll numbers unique so duplicate rows can be skipped safely',
                'Safe to re-run — duplicate roll numbers are skipped',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 text-xs text-gray-500">
                  <span className="text-[#6fcf6f] font-bold flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'parents' && (
        <ParentLinker
          students={parentLinkStudents}
          initialLinks={initialLinks}
        />
      )}
    </div>
  )
}
