'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Student = {
  id: string
  name: string
  roll_no: string
  email: string | null
  stage: string
  class_num: number | null
  created_at: string
}

type MarkRow = {
  subject: string
  exam: string
  percent: number
}

type DrawerData = {
  attendanceRate: number | null
  marks: MarkRow[]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function StudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const filtered = search.trim()
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : students

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedStudent(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function openDrawer(student: Student) {
    setSelectedStudent(student)
    setDrawerLoading(true)
    setDrawerData(null)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString().split('T')[0]

    const [{ data: logs }, { data: marks }] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('status')
        .eq('student_id', student.id)
        .gte('day', since),
      supabase
        .from('marks')
        .select('subject, exam, percent')
        .eq('student_id', student.id)
        .order('exam')
        .order('subject'),
    ])

    const total = logs?.length ?? 0
    const present = logs?.filter(l => l.status === 'present').length ?? 0
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null

    setDrawerData({ attendanceRate, marks: marks ?? [] })
    setDrawerLoading(false)
  }

  const marksByExam = drawerData?.marks.reduce<Record<string, MarkRow[]>>((acc, m) => {
    if (!acc[m.exam]) acc[m.exam] = []
    acc[m.exam].push(m)
    return acc
  }, {}) ?? {}

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search students..."
          className="w-full max-w-sm bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">ID</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Class</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((student, i) => (
              <tr
                key={student.id}
                onClick={() => openDrawer(student)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${i < filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6fcf6f] flex items-center justify-center text-[#1a2e1a] text-[11px] font-bold flex-shrink-0">
                      {getInitials(student.name)}
                    </div>
                    <span className="font-medium text-gray-900">{student.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">{student.roll_no}</td>
                <td className="px-4 py-3.5 text-gray-500 text-sm">{student.stage}</td>
                <td className="px-4 py-3.5 text-gray-500 text-sm">{student.class_num ?? '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">
                  {search ? `No students match "${search}"` : 'No students found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Overlay — rendered only when drawer is open */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/25 z-40"
          onClick={() => setSelectedStudent(null)}
        />
      )}

      {/* Drawer — always in DOM, slides via transform */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          selectedStudent ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedStudent && (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#6fcf6f] flex items-center justify-center text-[#1a2e1a] text-sm font-bold flex-shrink-0">
                  {getInitials(selectedStudent.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{selectedStudent.name}</div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">{selectedStudent.roll_no}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-shrink-0 ml-2 mt-0.5"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#f8f7f4] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Stage</div>
                  <div className="text-sm font-medium text-gray-900">{selectedStudent.stage}</div>
                </div>
                <div className="bg-[#f8f7f4] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Class</div>
                  <div className="text-sm font-medium text-gray-900">{selectedStudent.class_num ?? '—'}</div>
                </div>
                {selectedStudent.email && (
                  <div className="bg-[#f8f7f4] rounded-lg p-3 col-span-2">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Email</div>
                    <div className="text-sm font-medium text-gray-900 truncate">{selectedStudent.email}</div>
                  </div>
                )}
              </div>

              {drawerLoading ? (
                <div className="py-10 text-center text-xs text-gray-400">Loading...</div>
              ) : drawerData ? (
                <>
                  {/* Attendance */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2.5">Attendance — last 30 days</div>
                    {drawerData.attendanceRate !== null ? (
                      <div className="bg-[#f8f7f4] rounded-lg p-4">
                        <div className="flex items-end justify-between mb-2.5">
                          <span className={`text-2xl font-bold ${
                            drawerData.attendanceRate >= 75 ? 'text-[#6fcf6f]'
                            : drawerData.attendanceRate >= 50 ? 'text-amber-500'
                            : 'text-red-500'
                          }`}>
                            {drawerData.attendanceRate}%
                          </span>
                          <span className="text-[11px] text-gray-400 mb-0.5">present</span>
                        </div>
                        <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              drawerData.attendanceRate >= 75 ? 'bg-[#6fcf6f]'
                              : drawerData.attendanceRate >= 50 ? 'bg-amber-400'
                              : 'bg-red-400'
                            }`}
                            style={{ width: `${drawerData.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#f8f7f4] rounded-lg px-4 py-3 text-xs text-gray-400">
                        No records in the last 30 days
                      </div>
                    )}
                  </div>

                  {/* Marks */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2.5">Marks</div>
                    {Object.keys(marksByExam).length > 0 ? Object.entries(marksByExam).map(([exam, rows]) => (
                      <div key={exam} className="mb-3 last:mb-0">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">{exam}</div>
                        <div className="bg-[#f8f7f4] rounded-lg overflow-hidden">
                          {rows.map((row, i) => (
                            <div
                              key={row.subject}
                              className={`px-3.5 py-2.5 flex items-center justify-between ${i < rows.length - 1 ? 'border-b border-white' : ''}`}
                            >
                              <span className="text-xs text-gray-600 capitalize">{row.subject}</span>
                              <span className={`text-xs font-semibold ${row.percent >= 60 ? 'text-green-700' : 'text-red-500'}`}>
                                {row.percent}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <div className="bg-[#f8f7f4] rounded-lg px-4 py-3 text-xs text-gray-400">
                        No marks recorded
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  )
}
