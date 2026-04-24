'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { CommandPalette } from './CommandPalette'
import { createClient } from '@/lib/supabase/client'

export type PaletteUserCtx = { role: string; schoolId: string | null }

type PaletteCtx = { openPalette: () => void }
const CommandPaletteContext = createContext<PaletteCtx>({ openPalette: () => {} })
export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

export function CommandPaletteProvider({
  children,
  initialUserCtx = null,
}: {
  children?: React.ReactNode
  initialUserCtx?: PaletteUserCtx | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [userCtx, setUserCtx] = useState<PaletteUserCtx | null>(initialUserCtx)
  const supabase = createClient()

  const loadUserCtx = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setUserCtx(null)
        return null
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role, school_id')
        .eq('user_id', user.id)
        .single()

      if (!data) {
        setUserCtx(null)
        return null
      }

      const nextCtx = {
        role: data.role as string,
        schoolId: data.school_id as string | null,
      }
      setUserCtx(nextCtx)
      return nextCtx
    } catch {
      return null
    }
  }, [supabase])

  // Keep local state aligned when the server-seeded context changes after navigation.
  useEffect(() => {
    setUserCtx(initialUserCtx)
  }, [initialUserCtx])

  // Fetch role on mount when there is no server seed yet.
  useEffect(() => {
    if (!initialUserCtx) {
      void loadUserCtx()
    }
  }, [initialUserCtx, loadUserCtx])

  // Recover immediately after client-side login/logout without requiring refresh.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserCtx(null)
        setIsOpen(false)
        return
      }
      void loadUserCtx()
    })

    return () => subscription.unsubscribe()
  }, [loadUserCtx, supabase])

  // Global Cmd+K / Ctrl+K listener — skip when focus is inside a text field
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!((e.metaKey || e.ctrlKey) && e.key === 'k')) return
      const t = e.target as HTMLElement
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        t.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      if (userCtx) {
        setIsOpen((v) => !v)
        return
      }
      void loadUserCtx().then((ctx) => {
        if (ctx) setIsOpen(true)
      })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loadUserCtx, userCtx])

  const open = useCallback(() => {
    if (userCtx) {
      setIsOpen(true)
      return
    }
    void loadUserCtx().then((ctx) => {
      if (ctx) setIsOpen(true)
    })
  }, [loadUserCtx, userCtx])

  const close = () => setIsOpen(false)

  return (
    <CommandPaletteContext.Provider value={{ openPalette: open }}>
      {children}

      {/* Mobile floating search button — only when logged in */}
      {userCtx && (
        <button
          onClick={open}
          aria-label="Open command palette"
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2e1a] text-[#6fcf6f] shadow-lg transition-all hover:bg-[#243824] active:scale-95 md:hidden"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      {/* Palette modal — only rendered when open and role is known */}
      {userCtx && (
        <CommandPalette
          isOpen={isOpen}
          onClose={close}
          userRole={userCtx.role}
          schoolId={userCtx.schoolId}
        />
      )}
    </CommandPaletteContext.Provider>
  )
}
