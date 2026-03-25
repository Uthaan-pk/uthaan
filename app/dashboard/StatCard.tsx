'use client'

import Link from 'next/link'

const iconBg: Record<string, string> = {
  green: 'bg-green-50',
  blue: 'bg-blue-50',
  amber: 'bg-amber-50',
  purple: 'bg-purple-50',
}

export default function StatCard({ label, value, change, icon, color, href }: {
  label: string
  value: number | string
  change: string
  icon: string
  color: string
  href: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all">
        <div className={`w-8 h-8 ${iconBg[color]} rounded-lg flex items-center justify-center text-sm mb-3`}>{icon}</div>
        <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        <div className="text-[11px] text-green-700 mt-1">{change}</div>
      </div>
    </Link>
  )
}
