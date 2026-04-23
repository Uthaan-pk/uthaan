'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { CommandPalette } from './CommandPalette'
import { createClient } from '@/lib/supabase/client'

type UserCtx = { role: string; schoolId: string | null }

export function CommandPaletteProvider({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null)

  // Fetch role once on mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('user_roles')
          .select('role, school_id')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setUserCtx({ role: data.role as string, schoolId: data.school_id as string | null })
        }
      } catch {
        // Not logged in — palette stays hidden
      }
    }
    load()
  }, [])

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
      if (userCtx) setIsOpen((v) => !v)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [userCtx])

  const open = () => userCtx && setIsOpen(true)
  const close = () => setIsOpen(false)

  return (
    <>
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
    </>
  )
}
