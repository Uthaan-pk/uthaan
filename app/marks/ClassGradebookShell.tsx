'use client'

import { useMemo, useState } from 'react'
import MarksEditor from './MarksEditor'
import { CURRENT_TERM } from '@/lib/constants'
import type { WeightRow, ExamType } from '@/lib/gradeUtils'

type Student = {
  id: string
  name: string
  roll_no: string
  class_num: number | string | null
  user_id?: string | null
}

type AllMarksData = Record<string, Record<string, Record<string, number | null>>>

type Assignment = {
  id: string
  title: string
  subject: string
  class_num: number | null
  due_date: string | null
  created_at?: string | null
}

type Submission = {
  id: string
  assignment_id: string
  student_id: string
  grade: string | null
  submitted_at: string | null
  reviewed: boolean | null
}

export default function ClassGradebookShell({
  allStudents,
  allMarks,
  assignments,
  submissions,
  weightRows,
  quizAvgByStudentId,
  assignmentAvgByStudentId,
  examTypes = [],
  visibleSubjects = [],
  readOnlyGradesOnly = false,
}: {
  allStudents: Student[]
  allMarks: AllMarksData
  assignments: Assignment[]
  submissions: Submission[]
  weightRows: WeightRow[]
  quizAvgByStudentId: Record<string, number>
  assignmentAvgByStudentId: Record<string, number>
  examTypes?: ExamType[]
  visibleSubjects?: string[]
  readOnlyGradesOnly?: boolean
}) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null)

  const classNums = useMemo(() => {
    const set = new Set<number>()
    allStudents.forEach(s => {
      const n = Number(s.class_num)
      if (!isNaN(n) && n > 0) set.add(n)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [allStudents])

  const classStudents = useMemo(
    () =>
      selectedClass == null
        ? []
        : allStudents.filter(s => Number(s.class_num) === selectedClass),
    [allStudents, selectedClass]
  )

  const classAssignments = useMemo(
    () =>
      selectedClass == null
        ? []
        : assignments.filter(a => a.class_num === selectedClass),
    [assignments, selectedClass]
  )

  const classWeightRows = useMemo(
    () =>
      selectedClass == null
        ? []
        : weightRows.filter(w => w.class_num === selectedClass),
    [weightRows, selectedClass]
  )

  const studentCountByClass = useMemo(() => {
    const counts: Record<number, number> = {}
    allStudents.forEach(s => {
      const n = Number(s.class_num)
      if (!isNaN(n) && n > 0) {
        counts[n] = (counts[n] ?? 0) + 1
      }
    })
    return counts
  }, [allStudents])

  const assignmentCountByClass = useMemo(() => {
    const counts: Record<number, number> = {}
    assignments.forEach(a => {
      if (a.class_num != null) {
        counts[a.class_num] = (counts[a.class_num] ?? 0) + 1
      }
    })
    return counts
  }, [assignments])

  const visibleSubjectList = useMemo(() => {
    if (visibleSubjects.length === 0) return null
    return visibleSubjects.join(', ')
  }, [visibleSubjects])

  if (selectedClass === null) {
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Select a Class</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {readOnlyGradesOnly
              ? 'Choose a class to review final grades.'
              : 'Choose a class to enter marks, review assignments, and see final grades.'}
          </p>
          {visibleSubjectList && (
            <p className="text-xs text-gray-400 mt-1">
              Your assigned subject{visibleSubjects.length !== 1 ? 's' : ''}:{' '}
              <span className="capitalize">{visibleSubjectList}</span>
            </p>
          )}
        </div>

        {classNums.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-400">
            No classes are currently assigned to this account.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classNums.map(classNum => {
              const studentCount = studentCountByClass[classNum] ?? 0
              const asgCount = assignmentCountByClass[classNum] ?? 0
              const hasWeights = weightRows.some(w => w.class_num === classNum)

              return (
                <button
                  key={classNum}
                  onClick={() => setSelectedClass(classNum)}
                  className="bg-white rounded-xl border border-gray-100 p-5 text-left hover:border-[#6fcf6f]/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1a2e1a]/[0.06] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[#1a2e1a]">
                        {classNum}
                      </span>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-[#6fcf6f] transition-colors mt-1 flex-shrink-0"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </div>

                  <div className="text-sm font-semibold text-gray-900 mb-0.5">
                    Class {classNum}
                  </div>
                  <div className="text-xs text-gray-400">
                    {studentCount} student{studentCount !== 1 ? 's' : ''}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <span className="text-[11px] text-gray-400">
                      {asgCount} assignment{asgCount !== 1 ? 's' : ''}
                    </span>
                    {hasWeights && (
                      <span className="text-[10px] bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/20 rounded px-1.5 py-0.5 font-medium">
                        Grade weights set
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <button
          onClick={() => setSelectedClass(null)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2L3 6.5l5 4.5" />
          </svg>
          All Classes
        </button>
        <span className="text-gray-300 text-xs">/</span>
        <span className="text-sm font-semibold text-gray-900">
          Class {selectedClass}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {classStudents.length} student{classStudents.length !== 1 ? 's' : ''} ·{' '}
          {CURRENT_TERM}
        </span>
      </div>

      <MarksEditor
        key={`class-${selectedClass}`}
        students={classStudents}
        allMarks={allMarks}
        weightRows={classWeightRows}
        assignments={classAssignments}
        submissions={submissions}
        quizAvgByStudentId={quizAvgByStudentId}
        assignmentAvgByStudentId={assignmentAvgByStudentId}
        examTypes={examTypes}
        visibleSubjects={visibleSubjects}
        readOnlyGradesOnly={readOnlyGradesOnly}
      />
    </div>
  )
}
