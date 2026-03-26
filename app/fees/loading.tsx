export default function FeesLoading() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-56 flex-shrink-0 bg-[#1a2e1a]" />

      <div className="flex-1 overflow-auto bg-[#f8f7f4] p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 px-5 py-4 space-y-2">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 mb-4 flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="border-b border-gray-50 px-5 py-3 flex gap-6">
            {[120, 60, 80, 100, 80, 60, 70].map((w, i) => (
              <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b border-gray-50 last:border-0 px-5 py-3.5 flex gap-6 items-center">
              {[120, 60, 80, 100, 80, 60, 70].map((w, j) => (
                <div key={j} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
