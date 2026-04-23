'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { Loader2, Search, X, Zap } from 'lucide-react'
import { getEntriesForRole, type PageEntry } from '@/lib/commandPaletteIndex'
import { createClient } from '@/lib/supabase/client'

type StudentHit = {
  id: string
  name: string
  roll_no: string | null
  stage: string | null
  class_num: number | null
}

type FlatResult =
  | { type: 'page'; item: PageEntry }
  | { type: 'action'; item: PageEntry }
  | { type: 'student'; item: StudentHit }

const FUSE_OPTS = {
  keys: ['label', 'description', 'keywords'],
  threshold: 0.4,
  includeScore: true,
}

export function CommandPalette({
  isOpen,
  onClose,
  userRole,
  schoolId,
}: {
  isOpen: boolean
  onClose: () => void
  userRole: string
  schoolId: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [students, setStudents] = useState<StudentHit[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const isStaff = userRole === 'teacher' || userRole === 'admin'

  const pages = useMemo(() => getEntriesForRole(userRole, 'page'), [userRole])
  const actions = useMemo(() => getEntriesForRole(userRole, 'action'), [userRole])

  const pageFuse = useMemo(() => new Fuse(pages, FUSE_OPTS), [pages])
  const actionFuse = useMemo(() => new Fuse(actions, FUSE_OPTS), [actions])

  const pageResults = useMemo(
    () => (query ? pageFuse.search(query).map((r) => r.item) : pages.slice(0, 8)),
    [query, pageFuse, pages]
  )
  const actionResults = useMemo(
    () => (query ? actionFuse.search(query).map((r) => r.item) : actions.slice(0, 5)),
    [query, actionFuse, actions]
  )

  // Debounced student search — staff only, 3+ chars.
  // `stale` flag lives in the closure shared by both the timeout callback and
  // the cleanup, so a slow in-flight request can never overwrite results from
  // a newer query even after the debounce timer itself has already fired.
  useEffect(() => {
    if (!isStaff || !schoolId || query.length < 3) {
      setStudents([])
      setLoadingStudents(false)
      return
    }
    let stale = false
    setLoadingStudents(true)
    const t = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('students')
          .select('id, name, roll_no, stage, class_num')
          .eq('school_id', schoolId)
          .ilike('name', `%${query}%`)
          .limit(5)
        if (!stale) setStudents((data as StudentHit[]) ?? [])
      } catch {
        if (!stale) setStudents([])
      } finally {
        if (!stale) setLoadingStudents(false)
      }
    }, 280)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [query, isStaff, schoolId])

  const flatResults = useMemo<FlatResult[]>(
    () => [
      ...pageResults.map((item) => ({ type: 'page' as const, item })),
      ...actionResults.map((item) => ({ type: 'action' as const, item })),
      ...students.map((item) => ({ type: 'student' as const, item })),
    ],
    [pageResults, actionResults, students]
  )

  const clamped = Math.min(activeIndex, Math.max(0, flatResults.length - 1))

  const navigate = useCallback(
    (result: FlatResult) => {
      if (result.type === 'student') {
        router.push(`/students?search=${encodeURIComponent(result.item.name)}`)
      } else {
        router.push(result.item.href)
      }
      onClose()
    },
    [router, onClose]
  )

  // Reset on open
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActiveIndex(0)
    setStudents([])
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [isOpen])

  // Reset active index when results list changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && flatResults.length > 0) {
        navigate(flatResults[clamped])
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatResults, clamped, navigate, onClose])

  if (!isOpen) return null

  const pageStart = 0
  const actionStart = pageResults.length
  const studentStart = pageResults.length + actionResults.length

  function getSectionLabel(idx: number): string | null {
    if (idx === pageStart && pageResults.length > 0) return 'Pages'
    if (idx === actionStart && actionResults.length > 0) return 'Quick Actions'
    if (idx === studentStart && students.length > 0) return 'Students'
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed inset-x-0 top-0 z-[61] flex justify-center px-4 pt-[10vh]"
      >
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Input row */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isStaff
                  ? 'Search pages, students, actions…'
                  : 'Search pages and actions…'
              }
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              aria-label="Search"
              autoComplete="off"
              spellCheck={false}
            />
            {loadingStudents && (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-gray-400"
                aria-hidden
              />
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto pb-2">
            {flatResults.length === 0 && !loadingStudents ? (
              query ? (
                <p className="px-4 py-10 text-center text-sm text-gray-400">
                  No results for &ldquo;{query}&rdquo;
                </p>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-gray-400">
                  Start typing to search…
                </p>
              )
            ) : (
              flatResults.map((result, idx) => {
                const label = getSectionLabel(idx)
                const isActive = clamped === idx

                if (result.type === 'page' || result.type === 'action') {
                  const Icon = result.item.icon
                  return (
                    <div key={result.item.id}>
                      {label && (
                        <SectionHeader
                          label={label}
                          icon={result.type === 'action' ? <Zap className="h-3 w-3" /> : null}
                        />
                      )}
                      <button
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[#6fcf6f]/10 text-[#1a2e1a]'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigate(result)}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                            isActive
                              ? 'border-[#6fcf6f]/30 bg-[#6fcf6f]/15 text-[#1a2e1a]'
                              : 'border-gray-100 bg-gray-50 text-gray-500'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug">
                            {result.item.label}
                          </span>
                          {result.item.description && (
                            <span className="block truncate text-xs text-gray-400">
                              {result.item.description}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <kbd className="shrink-0 text-[10px] text-gray-400">↵</kbd>
                        )}
                      </button>
                    </div>
                  )
                }

                // Student result
                const stu = result.item
                const subtitle = [
                  stu.stage,
                  stu.class_num ? `Class ${stu.class_num}` : null,
                  stu.roll_no ? `Roll #${stu.roll_no}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <div key={stu.id}>
                    {label && <SectionHeader label={label} icon={null} />}
                    <button
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-[#6fcf6f]/10 text-[#1a2e1a]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigate(result)}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          isActive
                            ? 'border-[#6fcf6f]/30 bg-[#6fcf6f]/15 text-[#1a2e1a]'
                            : 'border-gray-100 bg-gray-50 text-gray-500'
                        }`}
                      >
                        {stu.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">
                          {stu.name}
                        </span>
                        {subtitle && (
                          <span className="block truncate text-xs text-gray-400">
                            {subtitle}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <kbd className="shrink-0 text-[10px] text-gray-400">↵</kbd>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-gray-50 px-4 py-2 text-[11px] text-gray-400">
            <span>
              <kbd className="rounded bg-gray-100 px-1 py-0.5">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded bg-gray-100 px-1 py-0.5">↵</kbd> open
            </span>
            <span>
              <kbd className="rounded bg-gray-100 px-1 py-0.5">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionHeader({
  label,
  icon,
}: {
  label: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 pb-1 pt-3">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </span>
    </div>
  )
}
