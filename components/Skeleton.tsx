/**
 * Reusable skeleton building blocks.
 * Usage:
 *   <SkeletonLine w="w-1/2" />
 *   <SkeletonCard rows={3} />
 *   <SkeletonStat />
 *   <SkeletonPage />        ← full-page shell (header + content rows)
 */

function pulse(extra = '') {
  return `animate-pulse rounded bg-gray-100 ${extra}`
}

/** A single horizontal line */
export function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${pulse()} ${w} ${h}`} />
}

/** A stat card placeholder */
export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 space-y-2">
      <SkeletonLine w="w-16" h="h-2.5" />
      <SkeletonLine w="w-24" h="h-5" />
    </div>
  )
}

/** A generic card with N content rows */
export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <SkeletonLine w="w-32" h="h-3.5" />
      </div>
      <div className="px-5 divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="py-3.5 flex items-center justify-between gap-4">
            <SkeletonLine w="w-1/3" />
            <SkeletonLine w="w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A table row placeholder */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <SkeletonLine w={i === 0 ? 'w-32' : 'w-16'} />
        </td>
      ))}
    </tr>
  )
}

/**
 * Full-page skeleton shell — mirrors the uthaan-page-shell layout.
 * Pass `headerRight` to show a pill-shaped placeholder on the right of the header.
 */
export function SkeletonPage({
  statCount = 0,
  cardRows = 5,
  headerRight = false,
}: {
  statCount?: number
  cardRows?: number
  headerRight?: boolean
}) {
  return (
    <div className="uthaan-page-main">
      {/* Header */}
      <div className="uthaan-page-header">
        <SkeletonLine w="w-28" h="h-4" />
        {headerRight && <SkeletonLine w="w-24" h="h-6" />}
      </div>

      <div className="uthaan-page-content">
        <div className="max-w-5xl space-y-5">
          {/* Stat cards row */}
          {statCount > 0 && (
            <div className={`grid gap-3 grid-cols-${statCount <= 2 ? statCount : 3}`}>
              {Array.from({ length: statCount }).map((_, i) => (
                <SkeletonStat key={i} />
              ))}
            </div>
          )}

          {/* Main card */}
          <SkeletonCard rows={cardRows} />
        </div>
      </div>
    </div>
  )
}
