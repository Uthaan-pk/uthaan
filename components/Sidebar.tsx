'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function NavItem({
  label,
  href,
  active,
  onClose,
  icon,
}: {
  label: string
  href: string
  active: boolean
  onClose: () => void
  icon?: React.ReactNode
}) {
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
      {icon}
      {label}
    </Link>
  )
}

function LangToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex gap-1 bg-white/10 rounded-lg p-1 mb-3">
      <button
        onClick={() => setLang('en')}
        className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-[#6fcf6f] text-[#1a2e1a]'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ur')}
        className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'ur'
            ? 'bg-[#6fcf6f] text-[#1a2e1a]'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        اردو
      </button>
    </div>
  )
}

export default function Sidebar({
  email,
  role,
}: {
  email: string
  role: string
}) {
  const pathname = usePathname()
  const username = email.split('@')[0]
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const { t } = useLanguage()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const close = () => setOpen(false)

  const asideDisplay: React.CSSProperties = {
    display: isMobile ? (open ? 'flex' : 'none') : 'flex',
    position: isMobile && open ? 'fixed' : undefined,
    inset: isMobile && open ? '0 auto 0 0' : undefined,
    zIndex: isMobile && open ? 50 : undefined,
    width: '14rem',
  }

  const isStaff = role === 'teacher' || role === 'admin'
  const isParent = role === 'parent'

  return (
    <>
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 50,
            height: '3.5rem',
            width: '3.5rem',
          }}
          className="flex items-center justify-center bg-white border-b border-r border-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <line x1="2" y1="4.5" x2="16" y2="4.5" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="13.5" x2="16" y2="13.5" />
          </svg>
        </button>
      )}

      {isMobile && open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={asideDisplay}
        className="flex-col flex-shrink-0 bg-[#1a2e1a]"
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#6fcf6f] tracking-tight">
              Uthaan
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
              {t.schoolManagement}
            </div>
          </div>

          {isMobile && (
            <button
              onClick={close}
              aria-label="Close menu"
              className="text-white/40 hover:text-white/70 p-1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              >
                <line x1="2" y1="2" x2="14" y2="14" />
                <line x1="14" y1="2" x2="2" y2="14" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mb-2">
            {t.main}
          </p>

          <NavItem
            label={t.dashboard}
            href="/dashboard"
            active={pathname === '/dashboard'}
            onClose={close}
          />

          {isStaff && (
            <NavItem
              label={t.students}
              href="/students"
              active={pathname === '/students'}
              onClose={close}
            />
          )}

          {isParent && (
            <NavItem
              label={t.myChild}
              href="/my-child"
              active={pathname === '/my-child'}
              onClose={close}
            />
          )}

          <NavItem
            label={t.announcements}
            href="/announcements"
            active={pathname === '/announcements'}
            onClose={close}
          />

          <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mt-4 mb-2">
            {t.academic}
          </p>

          <NavItem
            label={t.assignments}
            href="/assignments"
            active={pathname.startsWith('/assignments')}
            onClose={close}
          />

          <NavItem
            label={t.gradebook}
            href="/marks"
            active={pathname === '/marks'}
            onClose={close}
          />

          <NavItem
            label={t.attendance}
            href="/attendance"
            active={pathname === '/attendance'}
            onClose={close}
          />

          <NavItem
            label={t.quizzes}
            href="/quizzes"
            active={pathname.startsWith('/quizzes')}
            onClose={close}
          />

          <NavItem
            label={t.timetable}
            href="/timetable"
            active={pathname === '/timetable'}
            onClose={close}
          />

          <NavItem
            label={t.materials}
            href="/materials"
            active={pathname === '/materials'}
            onClose={close}
          />

          {(isStaff || role === 'student' || isParent) && (
            <NavItem
              label={t.fees}
              href="/fees"
              active={pathname === '/fees'}
              onClose={close}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              }
            />
          )}

          {isStaff && (
            <NavItem
              label={t.gradeSettings}
              href="/grade-settings"
              active={pathname === '/grade-settings'}
              onClose={close}
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7" cy="7" r="2" />
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" />
                </svg>
              }
            />
          )}

          {role === 'admin' && (
            <>
              <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mt-4 mb-2">
                {t.admin}
              </p>

              <NavItem
                label={t.adminPanel}
                href="/admin"
                active={pathname === '/admin'}
                onClose={close}
              />

              <NavItem
                label={t.schoolSignups}
                href="/admin/signups"
                active={pathname === '/admin/signups'}
                onClose={close}
              />
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <LangToggle />

          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-[#6fcf6f]/20 flex items-center justify-center text-[#6fcf6f] text-xs font-semibold flex-shrink-0">
              {getInitials(username)}
            </div>

            <div className="min-w-0">
              <div className="text-xs text-white/80 font-medium truncate">
                {username}
              </div>
              <div className="text-[10px] text-white/35 capitalize">
                {role}
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post" className="mt-3">
            <button className="w-full text-xs text-white/30 hover:text-red-400 transition-colors text-left px-2 py-1">
              {t.signOut} →
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
