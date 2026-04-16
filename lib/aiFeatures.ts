export const AI_FEATURES = [
  {
    key: 'ai_report_comments',
    label: 'AI Report Comments',
    description: 'Bulk report card comments for a selected class.',
    defaultEnabled: true,
  },
  {
    key: 'ai_assignment_feedback',
    label: 'AI Assignment Feedback',
    description: 'Draft feedback suggestions for assignments.',
    defaultEnabled: false,
  },
  {
    key: 'ai_quiz_generator',
    label: 'AI Quiz Generator',
    description: 'Generate quizzes from teacher prompts.',
    defaultEnabled: false,
  },
  {
    key: 'ai_attendance_alerts',
    label: 'AI Attendance Alerts',
    description: 'Generate attendance risk summaries and alerts.',
    defaultEnabled: false,
  },
] as const

export type AiFeatureKey = (typeof AI_FEATURES)[number]['key']

export type SchoolFeatureRow = {
  id: string
  school_id: string
  feature_key: AiFeatureKey
  enabled: boolean
  monthly_limit: number | null
  used_this_month: number
  last_reset_at: string
  created_at?: string | null
  updated_at?: string | null
}

export function getAiFeatureDefinition(featureKey: AiFeatureKey) {
  return AI_FEATURES.find((feature) => feature.key === featureKey) ?? null
}

export function buildDefaultSchoolFeature(
  schoolId: string,
  featureKey: AiFeatureKey
) {
  const feature = getAiFeatureDefinition(featureKey)

  return {
    school_id: schoolId,
    feature_key: featureKey,
    enabled: feature?.defaultEnabled ?? false,
    monthly_limit: null as number | null,
    used_this_month: 0,
    last_reset_at: new Date().toISOString(),
  }
}

export function buildDefaultSchoolFeatures(schoolId: string) {
  return AI_FEATURES.map((feature) => buildDefaultSchoolFeature(schoolId, feature.key))
}

export function isNewUsageMonth(lastResetAt: string | null | undefined) {
  if (!lastResetAt) return true

  const now = new Date()
  const last = new Date(lastResetAt)

  return (
    now.getUTCFullYear() !== last.getUTCFullYear() ||
    now.getUTCMonth() !== last.getUTCMonth()
  )
}
