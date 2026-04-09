'use client'

import { useRef, useState } from 'react'
import { importMarksFromCSV, type ImportResult } from './actions'

export default function CsvImport({
  schoolId,
  visibleSubjects,
}: {
  schoolId: string
  visibleSubjects: string[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.set('csv', file)

    const res = await importMarksFromCSV(formData, schoolId, visibleSubjects)
    setResult(res)
    setLoading(false)
    setShowModal(true)
    // Reset file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const header = 'student_id,subject,exam,score'
    const example = ',math,Unit Test,85'
    const blob = new Blob([header + '\n' + example + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'marks_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="text-xs text-gray-500 hover:text-[#1a2e1a] border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          CSV template
        </button>
        <label className={`text-xs font-medium border px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
          loading
            ? 'text-gray-400 border-gray-200 cursor-not-allowed'
            : 'text-[#1a2e1a] border-[#6fcf6f]/40 hover:bg-[#6fcf6f]/5'
        }`}>
          {loading ? 'Importing…' : 'Import CSV'}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={loading}
            onChange={handleFile}
          />
        </label>
      </div>

      {showModal && result && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Import Result</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" />
                  <line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-700">{result.imported}</span>
                <span className="text-sm text-gray-600">rows imported</span>
              </div>
              {result.skipped.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 mb-2">
                    {result.skipped.length} row{result.skipped.length !== 1 ? 's' : ''} skipped
                  </div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <li key={i} className="text-xs text-gray-500">
                        {s.row > 0 ? <span className="text-gray-400">Row {s.row}: </span> : null}
                        {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm font-medium bg-[#1a2e1a] text-[#6fcf6f] px-5 py-2 rounded-lg hover:bg-[#243d24] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
