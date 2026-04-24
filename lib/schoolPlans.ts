import type { AiFeatureKey } from './aiFeatures'

export const SCHOOL_PLANS = [
  'pilot',
  'starter',
  'growth',
  'pro',
  'enterprise',
] as const

export type SchoolPlan = (typeof SCHOOL_PLANS)[number]

export type SchoolPlanFeatureConfig = Record<
  AiFeatureKey,
  {
    enabled: boolean
    monthly_limit: number
  }
>

export const SCHOOL_PLAN_PRESETS: Record<SchoolPlan, SchoolPlanFeatureConfig> = {
  starter: {
    ai_report_comments: { enabled: false, monthly_limit: 0 },
    ai_attendance_alerts: { enabled: false, monthly_limit: 0 },
    ai_assignment_feedback: { enabled: false, monthly_limit: 0 },
    ai_quiz_generator: { enabled: false, monthly_limit: 0 },
  },
  growth: {
    ai_report_comments: { enabled: true, monthly_limit: 50 },
    ai_attendance_alerts: { enabled: true, monthly_limit: 10 },
    ai_assignment_feedback: { enabled: false, monthly_limit: 0 },
    ai_quiz_generator: { enabled: false, monthly_limit: 0 },
  },
  pro: {
    ai_report_comments: { enabled: true, monthly_limit: 200 },
    ai_attendance_alerts: { enabled: true, monthly_limit: 50 },
    ai_assignment_feedback: { enabled: true, monthly_limit: 100 },
    ai_quiz_generator: { enabled: true, monthly_limit: 50 },
  },
  pilot: {
    ai_report_comments: { enabled: true, monthly_limit: 100 },
    ai_attendance_alerts: { enabled: true, monthly_limit: 20 },
    ai_assignment_feedback: { enabled: true, monthly_limit: 20 },
    ai_quiz_generator: { enabled: true, monthly_limit: 10 },
  },
  enterprise: {
    ai_report_comments: { enabled: true, monthly_limit: 1000 },
    ai_attendance_alerts: { enabled: true, monthly_limit: 200 },
    ai_assignment_feedback: { enabled: true, monthly_limit: 500 },
    ai_quiz_generator: { enabled: true, monthly_limit: 200 },
  },
}

export function isSchoolPlan(value: string): value is SchoolPlan {
  return SCHOOL_PLANS.includes(value as SchoolPlan)
}
