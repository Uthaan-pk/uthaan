import { SkeletonPage } from '@/components/Skeleton'

export default function FeesLoading() {
  return (
    <div className="uthaan-page-shell">
      <div className="w-56 flex-shrink-0 bg-[#1a2e1a]" />
      <SkeletonPage statCount={3} cardRows={6} headerRight />
    </div>
  )
}
