import type { FeatureKey } from './aiFeatures'

export const SCHOOL_PLANS = [
  'pilot',
  'starter',
  'growth',
  'pro',
  'enterprise',
] as const

export type SchoolPlan = (typeof SCHOOL_PLANS)[number]

export type SchoolPlanFeatureConfig = Record<
  FeatureKey,
  {
    enabled: boolean
    monthly_limit: number
  }
>

export const SCHOOL_PLAN_PRESETS: Record<SchoolPlan, SchoolPlanFeatureConfig> = {
  starter: {
    // AI — all disabled
    ai_report_comments:        { enabled: false, monthly_limit: 0 },
    ai_attendance_alerts:      { enabled: false, monthly_limit: 0 },
    ai_assignment_feedback:    { enabled: false, monthly_limit: 0 },
    ai_quiz_generator:         { enabled: false, monthly_limit: 0 },
    // Operational — limited
    report_cards:              { enabled: false, monthly_limit: 0 },
    parent_portal:             { enabled: false, monthly_limit: 0 },
    fee_analytics:             { enabled: false, monthly_limit: 0 },
    timetable:                 { enabled: false, monthly_limit: 0 },
    unlimited_announcements:   { enabled: false, monthly_limit: 5 },
    advanced_reporting:        { enabled: false, monthly_limit: 0 },
    custom_report_cards:       { enabled: false, monthly_limit: 0 },
    priority_support:          { enabled: false, monthly_limit: 0 },
  },
  growth: {
    // AI — core enabled
    ai_report_comments:        { enabled: true,  monthly_limit: 50  },
    ai_attendance_alerts:      { enabled: true,  monthly_limit: 10  },
    ai_assignment_feedback:    { enabled: false, monthly_limit: 0   },
    ai_quiz_generator:         { enabled: false, monthly_limit: 0   },
    // Operational — most enabled
    report_cards:              { enabled: true,  monthly_limit: 0 },
    parent_portal:             { enabled: true,  monthly_limit: 0 },
    fee_analytics:             { enabled: true,  monthly_limit: 0 },
    timetable:                 { enabled: true,  monthly_limit: 0 },
    unlimited_announcements:   { enabled: true,  monthly_limit: 0 },
    advanced_reporting:        { enabled: false, monthly_limit: 0 },
    custom_report_cards:       { enabled: false, monthly_limit: 0 },
    priority_support:          { enabled: false, monthly_limit: 0 },
  },
  pro: {
    // AI — all enabled, higher limits
    ai_report_comments:        { enabled: true, monthly_limit: 200 },
    ai_attendance_alerts:      { enabled: true, monthly_limit: 50  },
    ai_assignment_feedback:    { enabled: true, monthly_limit: 100 },
    ai_quiz_generator:         { enabled: true, monthly_limit: 50  },
    // Operational — all enabled
    report_cards:              { enabled: true, monthly_limit: 0 },
    parent_portal:             { enabled: true, monthly_limit: 0 },
    fee_analytics:             { enabled: true, monthly_limit: 0 },
    timetable:                 { enabled: true, monthly_limit: 0 },
    unlimited_announcements:   { enabled: true, monthly_limit: 0 },
    advanced_reporting:        { enabled: true, monthly_limit: 0 },
    custom_report_cards:       { enabled: true, monthly_limit: 0 },
    priority_support:          { enabled: true, monthly_limit: 0 },
  },
  pilot: {
    // AI — enabled with moderate limits
    ai_report_comments:        { enabled: true, monthly_limit: 100 },
    ai_attendance_alerts:      { enabled: true, monthly_limit: 20  },
    ai_assignment_feedback:    { enabled: true, monthly_limit: 20  },
    ai_quiz_generator:         { enabled: true, monthly_limit: 10  },
    // Operational — all enabled (pilot gets everything to experience full product)
    report_cards:              { enabled: true, monthly_limit: 0 },
    parent_portal:             { enabled: true, monthly_limit: 0 },
    fee_analytics:             { enabled: true, monthly_limit: 0 },
    timetable:                 { enabled: true, monthly_limit: 0 },
    unlimited_announcements:   { enabled: true, monthly_limit: 0 },
    advanced_reporting:        { enabled: true, monthly_limit: 0 },
    custom_report_cards:       { enabled: true, monthly_limit: 0 },
    priority_support:          { enabled: true, monthly_limit: 0 },
  },
  enterprise: {
    // AI — all enabled, highest limits
    ai_report_comments:        { enabled: true, monthly_limit: 1000 },
    ai_attendance_alerts:      { enabled: true, monthly_limit: 200  },
    ai_assignment_feedback:    { enabled: true, monthly_limit: 500  },
    ai_quiz_generator:         { enabled: true, monthly_limit: 200  },
    // Operational — all enabled
    report_cards:              { enabled: true, monthly_limit: 0 },
    parent_portal:             { enabled: true, monthly_limit: 0 },
    fee_analytics:             { enabled: true, monthly_limit: 0 },
    timetable:                 { enabled: true, monthly_limit: 0 },
    unlimited_announcements:   { enabled: true, monthly_limit: 0 },
    advanced_reporting:        { enabled: true, monthly_limit: 0 },
    custom_report_cards:       { enabled: true, monthly_limit: 0 },
    priority_support:          { enabled: true, monthly_limit: 0 },
  },
}

export function isSchoolPlan(value: string): value is SchoolPlan {
  return SCHOOL_PLANS.includes(value as SchoolPlan)
}
