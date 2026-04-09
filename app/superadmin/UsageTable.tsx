'use client'

import { useState } from 'react'

export type UsageRow = {
  schoolId: string
  schoolName: string
  students: number
  teachers: number
  quizzes: number
  assignments: number
  avgAttendance: number | null
}

type SortKey = keyof Omit<UsageRow, 'schoolId' | 'schoolName'>

export default function UsageTable({ rows }: { rows: UsageRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('students')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -1
    const bv = b[sortKey] ?? -1
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  const colHeaders: { key: SortKey; label: string }[] = [
    { key: 'students', label: 'Students' },
    { key: 'teachers', label: 'Teachers' },
    { key: 'quizzes', label: 'Quizzes (term)' },
    { key: 'assignments', label: 'Assignments (term)' },
    { key: 'avgAttendance', label: 'Avg Attendance' },
  ]

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-[#6fcf6f] ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">School</th>
              {colHeaders.map(({ key, label }) => (
                <th
                  key={key}
                  className="text-right text-xs font-medium text-gray-400 px-5 py-3 cursor-pointer hover:text-gray-600 whitespace-nowrap select-none"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.schoolId}
                className={i < sorted.length - 1 ? 'border-b border-gray-50' : ''}
              >
                <td className="px-5 py-3.5 font-medium text-gray-900">{row.schoolName}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {row.students}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {row.teachers}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {row.quizzes}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                  {row.assignments}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  {row.avgAttendance !== null ? (
                    <span
                      className={
                        row.avgAttendance >= 85
                          ? 'text-green-700'
                          : row.avgAttendance >= 75
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }
                    >
                      {row.avgAttendance}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
