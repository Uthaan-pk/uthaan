'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type CategoryRow = {
  id: string
  class_num: number | null
  category: string
  weight: number
}

const CATEGORIES = ['quiz', 'assignment', 'midterm', 'final'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABELS: Record<Category, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Midterm',
  final: 'Final',
}

function defaultWeights(): Record<Category, string> {
  return { quiz: '25', assignment: '25', midterm: '25', final: '25' }
}

export default function CategoryWeightsClient({
  schoolId,
  initialRows,
}: {
  schoolId: string
  initialRows: CategoryRow[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<CategoryRow[]>(initialRows)
  const [classNum, setClassNum] = useState<string>('') // '' = all classes
  const [weights, setWeights] = useState<Record<Category, string>>(defaultWeights())
  const [saving, setSaving] = useState(false)

  // Group existing rows by class_num
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryRow[]>()
    for (const r of rows) {
      const key = r.class_num == null ? 'all' : String(r.class_num)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [rows])

  function loadGroup(key: string) {
    const classValue = key === 'all' ? '' : key
    setClassNum(classValue)
    const groupRows = grouped.get(key) ?? []
    const w = defaultWeights()
    for (const r of groupRows) {
      if (CATEGORIES.includes(r.category as Category)) {
        w[r.category as Category] = String(r.weight)
      }
    }
    setWeights(w)
  }

  const total = CATEGORIES.reduce((s, c) => s + (Number(weights[c]) || 0), 0)
  const totalOk = total === 100

  async function handleSave() {
    if (!totalOk) { toast.error('Weights must sum to 100%.'); return }

    setSaving(true)
    const classVal = classNum.trim() === '' ? null : Number(classNum)

    const toUpsert = CATEGORIES.map((cat) => ({
      school_id: schoolId,
      class_num: classVal,
      category: cat,
      weight: Number(weights[cat]),
    }))

    const { data, error } = await supabase
      .from('grade_category_weights')
      .upsert(toUpsert, { onConflict: 'school_id,class_num,category' })
      .select()

    setSaving(false)
    if (error) { toast.error(error.message); return }

    if (data) {
      const newRows = data as CategoryRow[]
      setRows((prev) => {
        const without = prev.filter(
          (r) =>
            !(r.class_num === classVal && CATEGORIES.includes(r.category as Category))
        )
        return [...without, ...newRows]
      })
    }
    toast.success('Category weights saved!')
  }

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'
  const labelCls =
    'block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5'

  return (
    <div className="space-y-5">
      {/* Existing configurations */}
      {grouped.size > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Saved Category Weights
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from(grouped.entries()).map(([key, catRows]) => (
              <button
                key={key}
                onClick={() => loadGroup(key)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">
                  {key === 'all' ? 'All classes (default)' : `Class ${key}`}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap justify-end">
                  {catRows.map((r) => (
                    <span
                      key={r.category}
                      className="bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 capitalize"
                    >
                      {r.category} {r.weight}%
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-900">Category Weights</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            School-wide default weights for each grade category. Leave class blank to apply to all.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Class (leave blank for all)</label>
            <input
              type="number"
              min="1"
              max="12"
              value={classNum}
              onChange={(e) => setClassNum(e.target.value)}
              placeholder="e.g. 5 — or blank for all classes"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <label className={labelCls}>{CATEGORY_LABELS[cat]} %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={weights[cat]}
                  onChange={(e) =>
                    setWeights((prev) => ({ ...prev, [cat]: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          <div
            className={`flex items-center justify-between text-sm rounded-lg px-4 py-2.5 border ${
              totalOk
                ? 'bg-[#6fcf6f]/10 border-[#6fcf6f]/20 text-[#1a2e1a]'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            <span className="font-medium">Total</span>
            <span className="font-bold tabular-nums">
              {total}%{totalOk ? ' ✓' : ` — ${100 - total > 0 ? `${100 - total}% remaining` : `${total - 100}% over`}`}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !totalOk}
            className="w-full bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save category weights'}
          </button>
        </div>
      </div>
    </div>
  )
}
