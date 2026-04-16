'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Student = {
  id: string
  name: string
  roll_no: string
  email: string | null
  stage: string
  class_num: number | null
  created_at: string
  is_active?: boolean
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
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function attBadgeClass(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'bg-gray-50 text-gray-400'
  if (pct < 75) return 'bg-red-50 text-red-600'
  if (pct < 85) return 'bg-amber-50 text-amber-600'
  return 'bg-green-50 text-green-700'
}

const PAGE_SIZE = 50

export default function StudentsTable({
  students,
  attendanceMap = {},
}: {
  students: Student[]
  attendanceMap?: Record<string, number | null>
}) {
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [studentList, setStudentList] = useState<Student[]>(students)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    setStudentList(students.filter(student => student.is_active !== false))
  }, [students])

  const filtered = search.trim()
    ? studentList.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : studentList

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
    setArchiveError(null)
    setConfirmArchive(false)

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
    const attendanceRate =
      total > 0 ? Math.round((present / total) * 100) : null

    setDrawerData({ attendanceRate, marks: marks ?? [] })
    setDrawerLoading(false)
  }

  async function archiveStudent() {
    if (!selectedStudent) return

    setArchiveLoading(true)
    setArchiveError(null)

    const studentId = selectedStudent.id

    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', studentId)

    if (error) {
      setArchiveError(error.message || 'Failed to archive student.')
      setArchiveLoading(false)
      return
    }

    setStudentList(prev => prev.filter(student => student.id !== studentId))
    setSelectedStudent(null)
    setDrawerData(null)
    setArchiveLoading(false)
    setConfirmArchive(false)

    router.refresh()
  }

  const marksByExam =
    drawerData?.marks.reduce<Record<string, MarkRow[]>>((acc, m) => {
      if (!acc[m.exam]) acc[m.exam] = []
      acc[m.exam].push(m)
      return acc
    }, {}) ?? {}

  return (
    <>
      <div className="mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search students..."
          className="w-full max-w-sm bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Student
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  ID
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Stage
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Class
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Attendance
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? (
                pageRows.map((student, i) => (
                  <tr
                    key={student.id}
                    onClick={() => openDrawer(student)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      i < pageRows.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#6fcf6f] flex items-center justify-center text-[#1a2e1a] text-[11px] font-bold flex-shrink-0">
                          {getInitials(student.name)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">
                      {student.roll_no}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">
                      {student.stage}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-sm">
                      {student.class_num ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {(() => {
                        const pct = attendanceMap[student.id]
                        return (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${attBadgeClass(pct)}`}>
                            {pct !== null && pct !== undefined ? `${pct}%` : '—'}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-400"
                  >
                    {search
                      ? `No students match "${search}"`
                      : 'No active students found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 text-xs text-gray-500">{safePage} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/25 z-40"
          onClick={() => { setSelectedStudent(null); setConfirmArchive(false) }}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          selectedStudent ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedStudent && (
          <>
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#6fcf6f] flex items-center justify-center text-[#1a2e1a] text-sm font-bold flex-shrink-0">
                  {getInitials(selectedStudent.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {selectedStudent.name}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {selectedStudent.roll_no}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setConfirmArchive(false) }}
                className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-shrink-0 ml-2 mt-0.5"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#f8f7f4] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Stage
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedStudent.stage}
                  </div>
                </div>

                <div className="bg-[#f8f7f4] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Class
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedStudent.class_num ?? '—'}
                  </div>
                </div>

                {selectedStudent.email && (
                  <div className="bg-[#f8f7f4] rounded-lg p-3 col-span-2">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                      Email
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {selectedStudent.email}
                    </div>
                  </div>
                )}

                <div className="bg-[#f8f7f4] rounded-lg p-3 col-span-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Account Status
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedStudent.email ? 'Login enabled' : 'No login email'}
                  </div>
                </div>
              </div>

              {archiveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {archiveError}
                </div>
              )}

              {drawerLoading ? (
                <div className="py-10 text-center text-xs text-gray-400">
                  Loading...
                </div>
              ) : drawerData ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2.5">
                      Attendance — last 30 days
                    </div>
                    {drawerData.attendanceRate !== null ? (
                      <div className="bg-[#f8f7f4] rounded-lg p-4">
                        <div className="flex items-end justify-between mb-2.5">
                          <span
                            className={`text-2xl font-bold ${
                              drawerData.attendanceRate >= 75
                                ? 'text-[#6fcf6f]'
                                : drawerData.attendanceRate >= 50
                                  ? 'text-amber-500'
                                  : 'text-red-500'
                            }`}
                          >
                            {drawerData.attendanceRate}%
                          </span>
                          <span className="text-[11px] text-gray-400 mb-0.5">
                            present
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              drawerData.attendanceRate >= 75
                                ? 'bg-[#6fcf6f]'
                                : drawerData.attendanceRate >= 50
                                  ? 'bg-amber-400'
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

                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2.5">
                      Marks
                    </div>
                    {Object.keys(marksByExam).length > 0 ? (
                      Object.entries(marksByExam).map(([exam, rows]) => (
                        <div key={exam} className="mb-3 last:mb-0">
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">
                            {exam}
                          </div>
                          <div className="bg-[#f8f7f4] rounded-lg overflow-hidden">
                            {rows.map((row, i) => (
                              <div
                                key={`${exam}-${row.subject}-${i}`}
                                className={`px-3.5 py-2.5 flex items-center justify-between ${
                                  i < rows.length - 1
                                    ? 'border-b border-white'
                                    : ''
                                }`}
                              >
                                <span className="text-xs text-gray-600 capitalize">
                                  {row.subject}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    row.percent >= 60
                                      ? 'text-green-700'
                                      : 'text-red-500'
                                  }`}
                                >
                                  {row.percent}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#f8f7f4] rounded-lg px-4 py-3 text-xs text-gray-400">
                        No marks recorded
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
              {confirmArchive ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-red-700 flex-1">Are you sure?</span>
                  <button
                    onClick={archiveStudent}
                    disabled={archiveLoading}
                    className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 min-h-[32px]"
                  >
                    {archiveLoading ? 'Archiving…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmArchive(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Archive Student
                  </button>
                  <p className="mt-2 text-[11px] text-gray-400 text-center">
                    Archive removes the student from active lists but keeps history.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}