import type { SupabaseClient } from '@supabase/supabase-js'

type AuditParams = {
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
}

/**
 * Write a best-effort audit log entry. Errors are intentionally swallowed
 * so a failed audit write never blocks the primary mutation.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  params: AuditParams,
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: params.actor_user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
    })
  } catch {
    // best-effort — never let audit writes surface to the user
  }
}
