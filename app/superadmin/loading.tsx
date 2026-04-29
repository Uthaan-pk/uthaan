import { SkeletonCard } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="h-14 bg-[#1a2e1a]" />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <SkeletonCard rows={3} />
        <SkeletonCard rows={5} />
        <SkeletonCard rows={8} />
      </main>
    </div>
  )
}
