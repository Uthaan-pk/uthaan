import { SkeletonPage, SkeletonStat } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="uthaan-page-shell">
      {/* Sidebar placeholder */}
      <div className="w-56 flex-shrink-0 bg-[#1a2e1a]" />

      <SkeletonPage statCount={3} cardRows={5} headerRight />
    </div>
  )
}
