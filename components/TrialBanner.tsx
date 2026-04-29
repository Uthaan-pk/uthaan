import Link from 'next/link'
import type { FeatureStatus } from '@/lib/featureGate'

export default function TrialBanner({
  featureName,
  status,
}: {
  featureName: string
  status: FeatureStatus
}) {
  if (status.trialExpired) {
    return (
      <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <div className="text-xs text-amber-800">
          Your free trial of <strong>{featureName}</strong> has ended.{' '}
          <Link href="/demo" className="font-medium underline underline-offset-2 hover:text-amber-900">
            Upgrade to keep using it.
          </Link>
        </div>
      </div>
    )
  }

  if (status.trialActive) {
    return (
      <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div className="text-xs text-blue-800">
          Trial: <strong>{status.trialDaysRemaining} {status.trialDaysRemaining === 1 ? 'day' : 'days'} remaining</strong> for {featureName}.{' '}
          <Link href="/demo" className="font-medium underline underline-offset-2 hover:text-blue-900">
            Upgrade to keep this feature.
          </Link>
        </div>
      </div>
    )
  }

  return null
}
