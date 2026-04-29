import { SkeletonPage } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="uthaan-page-shell">
      <div className="w-56 flex-shrink-0 bg-[#1a2e1a]" />
      <SkeletonPage cardRows={8} />
    </div>
  )
}
