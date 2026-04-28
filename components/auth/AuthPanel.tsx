/**
 * AuthPanel
 * Shared left-side branding panel for login and signup pages.
 * - No fake stats
 * - Honest, specific copy
 * - Hidden on mobile (form takes priority)
 */

import Image from 'next/image'

export default function AuthPanel() {
  return (
    <div className="hidden lg:flex w-1/2 bg-[#1a2e1a] flex-col justify-between p-12">

      {/* Logo */}
      <div>
        <div className="flex items-center gap-3">
          <Image
            src="/brand/uthaan-icon.svg"
            alt=""
            width={34}
            height={34}
            className="h-8 w-8 rounded-[10px] shadow-[0_10px_24px_rgba(111,207,111,0.14)]"
            priority
          />
          <div
            className="text-3xl leading-none text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Uthaan
          </div>
        </div>
        <div className="text-xs text-white/30 uppercase tracking-widest mt-1">
          School Management System
        </div>
      </div>

      {/* Main copy */}
      <div>
        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Run your school.<br />
          Not paperwork.
        </h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-sm">
          Uthaan helps Pakistani schools manage attendance, fees, results,
          and parent communication — all in one place.
        </p>
      </div>

      {/* Honest trust signals — no made-up numbers */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] mt-1.5 flex-shrink-0" />
          <p className="text-white/50 text-xs leading-relaxed">
            Built specifically for Pakistani private schools — not a generic global product
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] mt-1.5 flex-shrink-0" />
          <p className="text-white/50 text-xs leading-relaxed">
            Supports Urdu and English — easy for any staff member to use
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6fcf6f] mt-1.5 flex-shrink-0" />
          <p className="text-white/50 text-xs leading-relaxed">
            Each school&apos;s data is completely private and isolated
          </p>
        </div>
      </div>

    </div>
  )
}
