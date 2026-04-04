/**
 * Shared academic term constants.
 * Update these once per term to propagate everywhere.
 */

export const CURRENT_TERM = 'Spring Term 2026'
export const CURRENT_YEAR = '2025-2026'

/** Attendance date range for the current term (used in report card PDF) */
export const TERM_START_DATE = '2026-01-01'
export const TERM_END_DATE   = new Date().toISOString().split('T')[0]
