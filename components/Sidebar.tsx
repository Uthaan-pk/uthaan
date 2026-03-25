'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  return (
    <aside className="w-56 bg-[#1a2e1a] flex flex-col flex-shrink-0">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="text-2xl font-bold text-[#6fcf6f] tracking-tight">Uthaan</div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">School Management</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mb-2">Main</p>
        {mainNav.map(item => (
          <NavItem key={item.href} label={item.label} href={item.href} active={pathname === item.href} />
        ))}
        <p className="text-[10px] text-white/30 uppercase tracking-widest px-2 mt-4 mb-2">Academic</p>
        {academicNav.map(item => (
          <NavItem key={item.href} label={item.label} href={item.href} active={pathname === item.href} />
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
  )
}

function NavItem({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
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
