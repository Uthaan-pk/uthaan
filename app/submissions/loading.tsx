export default function SubmissionsLoading() {
  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-56 flex-shrink-0 bg-[#1a2e1a]" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-16 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
