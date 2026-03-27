'use client'

import { useState } from 'react'

type Student = {
  id: string
  name: string
  roll_no: string
  email: string | null
  stage: string
  class_num: number | null
  created_at: string
}

type StudentRole = {
  user_id: string
  student_id: string | null
}

type ParentLink = {
  id: string
  parent_id: string
  student_id: string
}

type Props = {
  students: Student[]
  studentRoles: StudentRole[]
  parentLinks: ParentLink[]
}

const STAGES = [
  { value: 'pre_1', label: 'Pre-1' },
  { value: 'matric', label: 'Matric' },
  { value: 'o_levels', label: 'O-Levels' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminClient({ students: initialStudents, parentLinks: initialParentLinks }: Props) {
  const [tab, setTab] = useState<'students' | 'parents'>('students')
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [parentLinks, setParentLinks] = useState<ParentLink[]>(initialParentLinks)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', roll_no: '', email: '', stage: 'matric', class_num: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentStudentId, setParentStudentId] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    setFormSuccess('')
    if (!form.name.trim() || !form.roll_no.trim()) {
      setFormError('Name and Roll No are required.')
      setFormLoading(false)
      return
    }
    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        roll_no: form.roll_no.trim(),
        email: form.email.trim() || null,
        stage: form.stage,
        class_num: form.class_num ? parseInt(form.class_num, 10) : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Failed to create student.'); setFormLoading(false); return }
    setStudents(prev => [...prev, data.student].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', roll_no: '', email: '', stage: 'matric', class_num: '' })
    setFormSuccess(`${data.student.name} added successfully.`)
    setShowForm(false)
    setFormLoading(false)
  }

  async function handleLinkParent(e: React.FormEvent) {
    e.preventDefault()
    setLinkLoading(true)
    setLinkError('')
    setLinkSuccess('')
    if (!parentEmail.trim() || !parentStudentId) {
      setLinkError('Both parent email and student are required.')
      setLinkLoading(false)
      return
    }
    const res = await fetch('/api/admin/link-parent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_email: parentEmail.trim(), student_id: parentStudentId }),
    })
    const data = await res.json()
    if (!res.ok) { setLinkError(data.error || 'Failed to link parent.'); setLinkLoading(false); return }
    setParentLinks(prev => [...prev, data.link])
    setParentEmail('')
    setParentStudentId('')
    setLinkSuccess(`Parent linked to ${students.find(s => s.id === parentStudentId)?.name} successfully.`)
    setLinkLoading(false)
  }

  async function handleDeleteStudent(studentId: string, studentName: string) {
    if (!confirm(`Delete ${studentName}? This cannot be undone.`)) return
    const res = await fetch('/api/admin/delete-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    })
    if (res.ok) setStudents(prev => prev.filter(s => s.id !== studentId))
  }

  const linkedStudentIds = new Set(parentLinks.map(l => l.student_id))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('students')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'students' ? 'bg-[#1a2e1a] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
          Students ({students.length})
        </button>
        <button onClick={() => setTab('parents')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'parents' ? 'bg-[#1a2e1a] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
          Parent Links ({parentLinks.length})
        </button>
      </div>

      {tab === 'students' && (
        <div className="space-y-4">
          {formSuccess && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{formSuccess}</div>}
          {!showForm ? (
            <button onClick={() => { setShowForm(true); setFormSuccess('') }} className="bg-[#1a2e1a] hover:bg-[#243d24] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Add Student
            </button>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">New Student</h2>
              <form onSubmit={handleAddStudent} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ali Khan" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Roll No *</label>
                    <input value={form.roll_no} onChange={e => setForm(f => ({ ...f, roll_no: e.target.value }))} placeholder="STU-001" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email (optional)</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@school.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Stage *</label>
                    <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] appearance-none">
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class Number</label>
                    <input type="number" min="1" max="12" value={form.class_num} onChange={e => setForm(f => ({ ...f, class_num: e.target.value }))} placeholder="e.g. 9" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]" />
                  </div>
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={formLoading} className="bg-[#1a2e1a] hover:bg-[#243d24] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {formLoading ? 'Adding…' : 'Add Student'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setFormError('') }} className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2.5">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Student Roster</span>
              <span className="text-xs text-gray-400">{students.length} enrolled</span>
            </div>
            {students.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">No students yet. Add your first student above.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Roll No</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Class</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Parent</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => (
                    <tr key={student.id} className={`${i < students.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#6fcf6f] flex items-center justify-center text-[#1a2e1a] text-[10px] font-bold flex-shrink-0">{getInitials(student.name)}</div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                            {student.email && <div className="text-[11px] text-gray-400">{student.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-gray-400">{student.roll_no}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 capitalize">{student.stage.replace('_', '-')}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{student.class_num ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        {linkedStudentIds.has(student.id)
                          ? <span className="text-[11px] text-green-600 font-medium">Linked ✓</span>
                          : <span className="text-[11px] text-gray-300">No parent</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => handleDeleteStudent(student.id, student.name)} className="text-[11px] text-red-400 hover:text-red-600 transition-colors">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'parents' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Link Parent to Student</h2>
            <p className="text-xs text-gray-400 mb-4">The parent must have already signed up before you link them.</p>
            <form onSubmit={handleLinkParent} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Parent Email</label>
                  <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Their Child</label>
                  <select value={parentStudentId} onChange={e => setParentStudentId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] appearance-none">
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>)}
                  </select>
                </div>
              </div>
              {linkError && <p className="text-xs text-red-500">{linkError}</p>}
              {linkSuccess && <p className="text-xs text-green-600">{linkSuccess}</p>}
              <button type="submit" disabled={linkLoading} className="bg-[#1a2e1a] hover:bg-[#243d24] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                {linkLoading ? 'Linking…' : 'Link Parent'}
              </button>
            </form>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Parent Links ({parentLinks.length})</span>
            </div>
            {parentLinks.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">No parent links yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {parentLinks.map(link => {
                  const student = students.find(s => s.id === link.student_id)
                  return (
                    <div key={link.id} className="px-5 py-3.5 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Parent linked to <span className="font-medium">{student?.name ?? 'Unknown'}</span>
                        {student && <span className="text-xs text-gray-400 ml-1">({student.roll_no})</span>}
                      </div>
                      <span className="text-[11px] text-green-600 font-medium">Active</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
