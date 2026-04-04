'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  isUrdu,
}: {
  label: string
  href: string
  active: boolean
  onClose: () => void
  icon?: React.ReactNode
  isUrdu: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
        isUrdu ? 'text-[15px] leading-7' : 'text-sm'
      } ${
        active
          ? 'bg-[#6fcf6f]/15 text-[#6fcf6f] font-medium'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

function LangToggle() {
  const { lang, setLang } = useLanguage()
  const router = useRouter()

  function handleLangChange(nextLang: 'en' | 'ur') {
    setLang(nextLang)
    router.refresh()
  }

  return (
    <div className="flex gap-1 bg-white/10 rounded-lg p-1 mb-3">
      <button
        onClick={() => handleLangChange('en')}
        className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-[#6fcf6f] text-[#1a2e1a]'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handleLangChange('ur')}
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
  const [isMobile, setIsMobile] = useState(false)
  const { t, lang } = useLanguage()
  const isUrdu = lang === 'ur'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
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
  const canSeeResults = isStaff || role === 'student' || isParent

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
            <div
              className={`text-white/30 mt-0.5 ${
                isUrdu
                  ? 'text-xs tracking-normal'
                  : 'text-[10px] uppercase tracking-widest'
              }`}
            >
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
          <p
            className={`text-white/30 px-2 mb-2 ${
              isUrdu
                ? 'text-xs tracking-normal'
                : 'text-[10px] uppercase tracking-widest'
            }`}
          >
            {t.main}
          </p>

          <NavItem
            label={t.dashboard}
            href="/dashboard"
            active={pathname === '/dashboard'}
            onClose={close}
            isUrdu={isUrdu}
          />

          {isStaff && (
            <NavItem
              label={t.students}
              href="/students"
              active={pathname === '/students'}
              onClose={close}
              isUrdu={isUrdu}
            />
          )}

          {isParent && (
            <NavItem
              label={t.myChild}
              href="/my-child"
              active={pathname === '/my-child'}
              onClose={close}
              isUrdu={isUrdu}
            />
          )}

          <NavItem
            label={t.announcements}
            href="/announcements"
            active={pathname === '/announcements'}
            onClose={close}
            isUrdu={isUrdu}
          />

          <p
            className={`text-white/30 px-2 mt-4 mb-2 ${
              isUrdu
                ? 'text-xs tracking-normal'
                : 'text-[10px] uppercase tracking-widest'
            }`}
          >
            {t.academic}
          </p>

          <NavItem
            label={t.assignments}
            href="/assignments"
            active={pathname.startsWith('/assignments')}
            onClose={close}
            isUrdu={isUrdu}
          />

          <NavItem
            label={t.gradebook}
            href="/marks"
            active={pathname === '/marks'}
            onClose={close}
            isUrdu={isUrdu}
          />

          {canSeeResults && (
            <NavItem
              label={isStaff ? 'Results & Report Cards' : 'Results'}
              href="/results"
              active={pathname === '/results'}
              onClose={close}
              isUrdu={isUrdu}
            />
          )}

          <NavItem
            label={t.attendance}
            href="/attendance"
            active={pathname === '/attendance'}
            onClose={close}
            isUrdu={isUrdu}
          />

          <NavItem
            label={t.quizzes}
            href="/quizzes"
            active={pathname.startsWith('/quizzes')}
            onClose={close}
            isUrdu={isUrdu}
          />

          <NavItem
            label={t.timetable}
            href="/timetable"
            active={pathname === '/timetable'}
            onClose={close}
            isUrdu={isUrdu}
          />

          <NavItem
            label={t.materials}
            href="/materials"
            active={pathname === '/materials'}
            onClose={close}
            isUrdu={isUrdu}
          />

          {(role === 'admin' || role === 'student' || isParent) && (
            <NavItem
              label={t.fees}
              href="/fees"
              active={pathname === '/fees'}
              onClose={close}
              isUrdu={isUrdu}
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
              isUrdu={isUrdu}
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
              <p
                className={`text-white/30 px-2 mt-4 mb-2 ${
                  isUrdu
                    ? 'text-xs tracking-normal'
                    : 'text-[10px] uppercase tracking-widest'
                }`}
              >
                {t.admin}
              </p>

              <NavItem
                label={t.adminPanel}
                href="/admin"
                active={pathname === '/admin'}
                onClose={close}
                isUrdu={isUrdu}
              />

              <NavItem
                label={t.schoolSignups}
                href="/admin/signups"
                active={pathname === '/admin/signups'}
                onClose={close}
                isUrdu={isUrdu}
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
              <div
                className={`text-white/80 font-medium truncate ${
                  isUrdu ? 'text-sm' : 'text-xs'
                }`}
              >
                {username}
              </div>
              <div
                className={`text-white/35 capitalize ${
                  isUrdu ? 'text-xs' : 'text-[10px]'
                }`}
              >
                {role}
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/+19496858657"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-2 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors mb-1 ${
              isUrdu ? 'text-sm' : 'text-xs'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="currentColor"
              className="flex-shrink-0"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>Get help on WhatsApp</span>
          </a>

          <form action="/auth/signout" method="post" className="mt-3">
            <button
              className={`w-full hover:text-red-400 hover:bg-white/5 transition-colors text-left px-2 py-2 rounded-lg text-white/50 ${
                isUrdu ? 'text-sm' : 'text-xs'
              }`}
            >
              {t.signOut} →
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}