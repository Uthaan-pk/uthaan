import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('impersonate_school_id')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}