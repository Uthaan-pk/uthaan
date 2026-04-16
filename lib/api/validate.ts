import { ZodSchema } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Parse and validate an unknown value against a Zod schema.
 * Returns { data } on success or { error: NextResponse } on failure.
 */
export function parseBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors[0]?.message ?? 'Invalid request'
    return { error: NextResponse.json({ message }, { status: 400 }) }
  }
  return { data: result.data as T }
}

/** UUID v4 regex for validating path params before DB queries */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}
