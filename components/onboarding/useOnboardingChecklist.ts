/**
 * useOnboardingChecklist
 *
 * Manages which onboarding items the admin has completed.
 * Uses localStorage so it works immediately with zero DB changes.
 *
 * Optional DB upgrade: see the SQL note in the implementation guide.
 * If you later store completion in Supabase, swap the read/write
 * functions here without changing any component that uses this hook.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { CHECKLIST_ITEMS, STORAGE_KEY, type ChecklistItem } from './checklistItems'

export interface ChecklistState {
  items: ChecklistItem[]
  completed: Set<string>
  totalCount: number
  completedCount: number
  isAllDone: boolean
  isDismissed: boolean
  markDone: (id: string) => void
  markUndone: (id: string) => void
  dismiss: () => void
  reset: () => void   // useful for dev/testing
}

interface StoredData {
  completed: string[]
  dismissed: boolean
}

function readStorage(): StoredData {
  if (typeof window === 'undefined') return { completed: [], dismissed: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: [], dismissed: false }
    return JSON.parse(raw) as StoredData
  } catch {
    return { completed: [], dismissed: false }
  }
}

function writeStorage(data: StoredData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage quota exceeded or unavailable — fail silently
  }
}

export function useOnboardingChecklist(): ChecklistState {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [isDismissed, setIsDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = readStorage()
    setCompleted(new Set(stored.completed))
    setIsDismissed(stored.dismissed)
    setHydrated(true)
  }, [])

  const markDone = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev)
      next.add(id)
      const stored = readStorage()
      writeStorage({ ...stored, completed: [...next] })
      return next
    })
  }, [])

  const markUndone = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev)
      next.delete(id)
      const stored = readStorage()
      writeStorage({ ...stored, completed: [...next] })
      return next
    })
  }, [])

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    const stored = readStorage()
    writeStorage({ ...stored, dismissed: true })
  }, [])

  const reset = useCallback(() => {
    setCompleted(new Set())
    setIsDismissed(false)
    writeStorage({ completed: [], dismissed: false })
  }, [])

  return {
    items: CHECKLIST_ITEMS,
    completed: hydrated ? completed : new Set(),
    totalCount: CHECKLIST_ITEMS.length,
    completedCount: hydrated ? completed.size : 0,
    isAllDone: hydrated && completed.size >= CHECKLIST_ITEMS.length,
    isDismissed: hydrated ? isDismissed : false,
    markDone,
    markUndone,
    dismiss,
    reset,
  }
}
