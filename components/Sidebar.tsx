'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  ClipboardList,
  BookOpen,
  FileText,
  CalendarCheck,
  HelpCircle,
  Clock,
  FolderOpen,
  CreditCard,
  BarChart2,
  Search,
  Receipt,
  DollarSign,
} from 'lucide-react'
import { useCommandPalette } from './CommandPaletteProvider'

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
      className={`flex min-h-11 items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
        isUrdu ? 'text-[15px] leading-7' : 'text-sm'
      } ${
        active
          ? 'bg-[#6fcf6f]/15 text-[#6fcf6f] font-medium'
          : 'text-white/70 hover:text-white hover:bg-white/6'
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
    <div className="mb-3 flex gap-1 rounded-xl bg-white/10 p-1">
      <button
        onClick={() => handleLangChange('en')}
        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
          lang === 'en'
            ? 'bg-[#6fcf6f] text-[#1a2e1a]'
            : 'text-white/60 hover:text-white/85'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handleLangChange('ur')}
        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
          lang === 'ur'
            ? 'bg-[#6fcf6f] text-[#1a2e1a]'
            : 'text-white/60 hover:text-white/85'
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
  isImpersonating = false,
}: {
  email: string
  role: string
  isImpersonating?: boolean
}) {
  const pathname = usePathname()
  const username = email.split('@')[0]
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { t, lang } = useLanguage()
  const isUrdu = lang === 'ur'
  const { openPalette } = useCommandPalette()

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
    width: isMobile ? '16rem' : '14rem',
  }

  const isTeacher = role === 'teacher'
  const isAdmin = role === 'admin'
  const isAccountant = role === 'accountant'
  const isStaff = isTeacher || isAdmin
  const isParent = role === 'parent'
  const canSeeResults = isTeacher || isAdmin || role === 'student' || isParent
  const showAssignments = isTeacher || role === 'student' || isParent
  const showQuizzes = isTeacher || role === 'student' || isParent
  const showMaterials = isTeacher || role === 'student' || isParent
  const overviewLabel = isAdmin ? 'Overview' : t.main
  const schoolOperationsLabel = isUrdu ? 'اسکول آپریشنز' : 'School Operations'
  const childProgressLabel = isUrdu ? 'بچے کی پیش رفت' : 'Child Progress'

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
          <Image
            src="/brand/uthaan-icon.svg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg"
            priority
          />
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
        className="flex-col flex-shrink-0 bg-[#1a2e1a] shadow-xl shadow-black/10"
      >
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/brand/uthaan-icon.svg"
                alt=""
                width={30}
                height={30}
                className="h-7 w-7 shrink-0 rounded-[9px] shadow-[0_10px_24px_rgba(111,207,111,0.12)]"
                priority
              />
              <div
                className="truncate text-[26px] leading-none text-white"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Uthaan
              </div>
            </div>
            <div
              className={`text-white/30 mt-0.5 ${
                isUrdu
                  ? 'text-xs tracking-normal'
                : 'text-[11px] uppercase tracking-[0.18em]'
              }`}
            >
              {t.schoolManagement}
            </div>
          </div>

          {isMobile && (
            <button
              onClick={close}
              aria-label="Close menu"
              className="rounded-md p-2 text-white/40 hover:bg-white/5 hover:text-white/70"
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

        {/* Desktop search bar — hidden inside mobile drawer (mobile uses FAB) */}
        <div className="hidden md:block px-3 pt-3 pb-1">
          <button
            onClick={openPalette}
            aria-label="Open search"
            className="flex w-full items-center gap-2.5 rounded-xl bg-white/8 px-3 py-2 text-left transition-colors hover:bg-white/12"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
            <span className="flex-1 text-sm text-white/35">Search...</span>
            <kbd className="text-[10px] text-white/25">⌘K</kbd>
          </button>
        </div>

        {isImpersonating && (
          <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-amber-300 font-medium">Browsing school</span>
            <a
              href="/auth/exit-school"
              className="text-[11px] text-amber-300 hover:text-amber-100 underline underline-offset-2 transition-colors whitespace-nowrap"
            >
              Exit ↗
            </a>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p
            className={`text-white/30 px-2 mb-2 ${
              isUrdu
                ? 'text-xs tracking-normal'
                : 'text-[11px] uppercase tracking-[0.18em]'
            }`}
          >
            {overviewLabel}
          </p>

          <NavItem
            label={t.dashboard}
            href="/dashboard"
            active={pathname === '/dashboard'}
            onClose={close}
            isUrdu={isUrdu}
            icon={<LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === '/dashboard' ? '' : 'opacity-60'}`} />}
          />

          {isAdmin ? (
            <>
              <p
                className={`text-white/30 px-2 mt-4 mb-2 ${
                  isUrdu
                    ? 'text-xs tracking-normal'
                    : 'text-[10px] uppercase tracking-widest'
                }`}
              >
                {schoolOperationsLabel}
              </p>

              <NavItem
                label={t.students}
                href="/students"
                active={pathname === '/students'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Users className={`w-4 h-4 shrink-0 ${pathname === '/students' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.attendance}
                href="/attendance"
                active={pathname === '/attendance'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CalendarCheck className={`w-4 h-4 shrink-0 ${pathname === '/attendance' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.fees}
                href="/fees"
                active={pathname === '/fees'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CreditCard className={`w-4 h-4 shrink-0 ${pathname === '/fees' ? '' : 'opacity-60'}`} />}
              />

              {canSeeResults && (
                <NavItem
                  label="Results & Report Cards"
                  href="/results"
                  active={pathname === '/results'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<FileText className={`w-4 h-4 shrink-0 ${pathname === '/results' ? '' : 'opacity-60'}`} />}
                />
              )}

              <NavItem
                label={t.announcements}
                href="/announcements"
                active={pathname === '/announcements'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Megaphone className={`w-4 h-4 shrink-0 ${pathname === '/announcements' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.timetable}
                href="/timetable"
                active={pathname === '/timetable'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Clock className={`w-4 h-4 shrink-0 ${pathname === '/timetable' ? '' : 'opacity-60'}`} />}
              />

              <p
                className={`text-white/30 px-2 mt-4 mb-2 ${
                  isUrdu
                    ? 'text-xs tracking-normal'
                    : 'text-[10px] uppercase tracking-widest'
                }`}
              >
                {isUrdu ? 'فنانس' : 'Finance'}
              </p>

              <NavItem
                label={isUrdu ? 'اخراجات کی منظوری' : 'Expense Approvals'}
                href="/admin/expenses/approvals"
                active={pathname.startsWith('/admin/expenses')}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Receipt className={`w-4 h-4 shrink-0 ${pathname.startsWith('/admin/expenses') ? '' : 'opacity-60'}`} />}
              />
            </>
          ) : isAccountant ? (
            <>
              <NavItem
                label={isUrdu ? 'ڈیش بورڈ' : 'Dashboard'}
                href="/accounting"
                active={pathname === '/accounting'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === '/accounting' ? '' : 'opacity-60'}`} />}
              />

              <p
                className={`text-white/30 px-2 mt-4 mb-2 ${
                  isUrdu
                    ? 'text-xs tracking-normal'
                    : 'text-[10px] uppercase tracking-widest'
                }`}
              >
                {isUrdu ? 'فنانس' : 'Finance'}
              </p>

              <NavItem
                label={isUrdu ? 'فیس وصولی' : 'Fee Collection'}
                href="/accounting/fees"
                active={pathname === '/accounting/fees'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CreditCard className={`w-4 h-4 shrink-0 ${pathname === '/accounting/fees' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={isUrdu ? 'واجب الادا فیس' : 'Outstanding Fees'}
                href="/accounting/outstanding"
                active={pathname === '/accounting/outstanding'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<DollarSign className={`w-4 h-4 shrink-0 ${pathname === '/accounting/outstanding' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={isUrdu ? 'اخراجات' : 'Expenses'}
                href="/accounting/expenses"
                active={pathname === '/accounting/expenses'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Receipt className={`w-4 h-4 shrink-0 ${pathname === '/accounting/expenses' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={isUrdu ? 'رپورٹس' : 'Reports'}
                href="/accounting/reports"
                active={pathname === '/accounting/reports'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<BarChart2 className={`w-4 h-4 shrink-0 ${pathname === '/accounting/reports' ? '' : 'opacity-60'}`} />}
              />
            </>
          ) : isParent ? (
            <>
              <NavItem
                label={t.myChild}
                href="/my-child"
                active={pathname === '/my-child'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Users className={`w-4 h-4 shrink-0 ${pathname === '/my-child' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.announcements}
                href="/announcements"
                active={pathname === '/announcements'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Megaphone className={`w-4 h-4 shrink-0 ${pathname === '/announcements' ? '' : 'opacity-60'}`} />}
              />

              <p
                className={`text-white/30 px-2 mt-4 mb-2 ${
                  isUrdu
                    ? 'text-xs tracking-normal'
                    : 'text-[10px] uppercase tracking-widest'
                }`}
              >
                {childProgressLabel}
              </p>

              <NavItem
                label={t.attendance}
                href="/attendance"
                active={pathname === '/attendance'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CalendarCheck className={`w-4 h-4 shrink-0 ${pathname === '/attendance' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label="Results"
                href="/results"
                active={pathname === '/results'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<FileText className={`w-4 h-4 shrink-0 ${pathname === '/results' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.fees}
                href="/fees"
                active={pathname === '/fees'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CreditCard className={`w-4 h-4 shrink-0 ${pathname === '/fees' ? '' : 'opacity-60'}`} />}
              />

              <NavItem
                label={t.timetable}
                href="/timetable"
                active={pathname === '/timetable'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Clock className={`w-4 h-4 shrink-0 ${pathname === '/timetable' ? '' : 'opacity-60'}`} />}
              />
            </>
          ) : (
            <>
              {isStaff && (
                <NavItem
                  label={t.students}
                  href="/students"
                  active={pathname === '/students'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<Users className={`w-4 h-4 shrink-0 ${pathname === '/students' ? '' : 'opacity-60'}`} />}
                />
              )}
              <NavItem
                label={t.announcements}
                href="/announcements"
                active={pathname === '/announcements'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Megaphone className={`w-4 h-4 shrink-0 ${pathname === '/announcements' ? '' : 'opacity-60'}`} />}
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

              {showAssignments && (
                <NavItem
                  label={t.assignments}
                  href="/assignments"
                  active={pathname.startsWith('/assignments')}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<ClipboardList className={`w-4 h-4 shrink-0 ${pathname.startsWith('/assignments') ? '' : 'opacity-60'}`} />}
                />
              )}

              {role !== 'student' && (
                <NavItem
                  label={t.gradebook}
                  href="/marks"
                  active={pathname === '/marks'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<BookOpen className={`w-4 h-4 shrink-0 ${pathname === '/marks' ? '' : 'opacity-60'}`} />}
                />
              )}

              {canSeeResults && (
                <NavItem
                  label={isStaff ? 'Results & Report Cards' : 'Results'}
                  href="/results"
                  active={pathname === '/results'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<FileText className={`w-4 h-4 shrink-0 ${pathname === '/results' ? '' : 'opacity-60'}`} />}
                />
              )}

              <NavItem
                label={t.attendance}
                href="/attendance"
                active={pathname === '/attendance'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<CalendarCheck className={`w-4 h-4 shrink-0 ${pathname === '/attendance' ? '' : 'opacity-60'}`} />}
              />

              {showQuizzes && (
                <NavItem
                  label={t.quizzes}
                  href="/quizzes"
                  active={pathname.startsWith('/quizzes')}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<HelpCircle className={`w-4 h-4 shrink-0 ${pathname.startsWith('/quizzes') ? '' : 'opacity-60'}`} />}
                />
              )}

              <NavItem
                label={t.timetable}
                href="/timetable"
                active={pathname === '/timetable'}
                onClose={close}
                isUrdu={isUrdu}
                icon={<Clock className={`w-4 h-4 shrink-0 ${pathname === '/timetable' ? '' : 'opacity-60'}`} />}
              />

              {showMaterials && (
                <NavItem
                  label={t.materials}
                  href="/materials"
                  active={pathname === '/materials'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<FolderOpen className={`w-4 h-4 shrink-0 ${pathname === '/materials' ? '' : 'opacity-60'}`} />}
                />
              )}

              {(role === 'student' || isParent) && (
                <NavItem
                  label={t.fees}
                  href="/fees"
                  active={pathname === '/fees'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<CreditCard className={`w-4 h-4 shrink-0 ${pathname === '/fees' ? '' : 'opacity-60'}`} />}
                />
              )}

              {isTeacher && (
                <NavItem
                  label={t.analytics}
                  href="/analytics"
                  active={pathname === '/analytics'}
                  onClose={close}
                  isUrdu={isUrdu}
                  icon={<BarChart2 className={`w-4 h-4 shrink-0 ${pathname === '/analytics' ? '' : 'opacity-60'}`} />}
                />
              )}
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

          <Link
            href="/"
            onClick={close}
            className={`mt-3 block px-2 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors ${
              isUrdu ? 'text-sm' : 'text-xs'
            }`}
          >
            View website
          </Link>

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
