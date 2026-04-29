import Link from 'next/link'
import { Lock } from 'lucide-react'

export default function FeatureLockedCard({
  featureName,
  description,
  availableOn,
}: {
  featureName: string
  description: string
  availableOn: string
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Lock size={18} className="text-gray-400" />
          </span>
        </div>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">{featureName}</h2>
        <p className="mb-4 text-xs text-gray-500">{description}</p>
        <p className="mb-5 text-xs text-gray-400">
          Available on <span className="font-medium text-gray-600">{availableOn}</span> and above.
        </p>
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a2e1a] px-4 py-2 text-xs font-medium text-[#6fcf6f] transition-colors hover:bg-[#1a2e1a]/80"
        >
          Talk to us about upgrading
        </Link>
      </div>
    </div>
  )
}
