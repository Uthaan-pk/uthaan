export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-base font-semibold text-gray-900 mb-2">
          Account Suspended
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your school&rsquo;s Uthaan account has been suspended. Please contact
          support to resolve this.
        </p>

        <a
          href="mailto:support@uthaan.com"
          className="inline-flex items-center gap-2 bg-[#1a2e1a] text-white text-xs font-medium px-5 py-2.5 rounded-lg hover:bg-[#1a2e1a]/80 transition-colors"
        >
          Contact Support
        </a>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <a
            href="/auth/signout"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  )
}
