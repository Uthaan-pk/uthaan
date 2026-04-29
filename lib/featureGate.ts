import { createClient } from '@/lib/supabase/server'

export type FeatureStatus = {
  enabled: boolean
  trialActive: boolean
  trialExpired: boolean
  trialUntil: Date | null
  trialDaysRemaining: number | null
}

export async function isFeatureEnabled(
  schoolId: string,
  featureKey: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('school_features')
    .select('enabled, trial_until')
    .eq('school_id', schoolId)
    .eq('feature_key', featureKey)
    .single()

  if (data?.trial_until) {
    const trialUntil = new Date(data.trial_until)
    if (trialUntil > new Date()) return true
  }

  return data?.enabled ?? false
}

export async function getFeatureLimit(
  schoolId: string,
  featureKey: string
): Promise<{ enabled: boolean; limit: number; used: number }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('school_features')
    .select('enabled, monthly_limit, used_this_month, trial_until')
    .eq('school_id', schoolId)
    .eq('feature_key', featureKey)
    .single()

  let enabled = data?.enabled ?? false
  if (data?.trial_until && new Date(data.trial_until) > new Date()) {
    enabled = true
  }

  return {
    enabled,
    limit: data?.monthly_limit ?? 0,
    used: data?.used_this_month ?? 0,
  }
}

export async function getFeatureStatus(
  schoolId: string,
  featureKey: string
): Promise<FeatureStatus> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('school_features')
    .select('enabled, trial_until')
    .eq('school_id', schoolId)
    .eq('feature_key', featureKey)
    .single()

  const now = new Date()
  const trialUntil = data?.trial_until ? new Date(data.trial_until) : null
  const trialActive = trialUntil !== null && trialUntil > now
  const trialExpired = trialUntil !== null && trialUntil <= now && !(data?.enabled ?? false)
  const trialDaysRemaining = trialActive && trialUntil
    ? Math.ceil((trialUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    enabled: trialActive || (data?.enabled ?? false),
    trialActive,
    trialExpired,
    trialUntil,
    trialDaysRemaining,
  }
}
