export type LeaveStatus = 'excused' | 'early_leave'

export function toYmd(value: unknown): string | null {
  if (!value) return null
  const raw = String(value)
  if (!raw) return null
  const ymd = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
}

function pickDate(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const ymd = toYmd(row[key])
    if (ymd) return ymd
  }
  return null
}

export function leaveCoversDay(row: Record<string, unknown>, day: string): boolean {
  const start = pickDate(row, ['start_date', 'from_date', 'day', 'date', 'leave_date'])
  if (!start) return false

  const end = pickDate(row, ['end_date', 'to_date', 'until_date']) ?? start
  return start <= day && day <= end
}

export function earlyLeaveOnDay(row: Record<string, unknown>, day: string): boolean {
  const d = pickDate(row, ['day', 'date', 'leave_date', 'early_leave_date'])
  return d === day
}

export function readLeaveReason(row: Record<string, unknown>): string | null {
  const reason = row.reason ?? row.note ?? row.notes ?? row.remarks
  if (!reason) return null
  const val = String(reason).trim()
  return val.length > 0 ? val : null
}

export function hasLeaveStatus(status: string | undefined): status is LeaveStatus {
  return status === 'excused' || status === 'early_leave'
}
