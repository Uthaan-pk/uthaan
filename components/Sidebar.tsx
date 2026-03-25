'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const mainNav = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Students', href: '/students' },
  { label: 'Notes', href: '/notes' },
  { label: 'Announcements', href: '/announcements' },
]

const academicNav = [
  { label: 'Marks', href: '/marks' },
  { label: 'Attendance', href: '/attendance' },
  { label: 'Quizzes', href: '/quizzes' },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Sidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname()
  const username = email.split('@')[0]
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <>
      {/* Hamburger — mobile only, always visible */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-0 left-0 z-50 h-14 w-14 flex items-center justify-center bg-white border-b border-r border-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      {/* Backdrop — mobile only, shown when open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={close}
        />
      )}

      {/* Sidebar:
          mobile closed  → hidden (display:none, completely out of layout)
          mobile open    → flex fixed overlay (z-50)
          desktop always → md:flex md:static (normal flow, no toggle) */}
      <aside
        className={`flex-col w-56 bg-[#1a2e1a] flex-shrink-0 md:flex md:static md:z-auto ${
          open ? 'flex fixed inset-y-0 left-0 z-50' : 'hidden'
        }`}
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#6fcf6f] tracking-tight">Uthaan</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">School Management</div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            aria-label="Close menu"
            className="md:hidden text-white/40 hover:text-white/70 transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mb-2">Main</p>
          {mainNav.map(item => (
            <NavItem key={item.href} label={item.label} href={item.href} active={pathname === item.href} onClose={close} />
          ))}
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mt-4 mb-2">Academic</p>
          {academicNav.map(item => (
            <NavItem key={item.href} label={item.label} href={item.href} active={pathname === item.href} onClose={close} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-[#6fcf6f]/20 flex items-center justify-center text-[#6fcf6f] text-xs font-semibold flex-shrink-0">
              {getInitials(username)}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white/80 font-medium truncate">{username}</div>
              <div className="text-[10px] text-white/35 capitalize">{role}</div>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-3">
            <button className="w-full text-xs text-white/30 hover:text-red-400 transition-colors text-left px-2 py-1">
              Sign out →
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

function NavItem({ label, href, active, onClose }: { label: string; href: string; active: boolean; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-[#6fcf6f]/15 text-[#6fcf6f] font-medium'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      {label}
    </Link>
  )
}
