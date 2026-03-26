import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import FeesClient from './FeesClient'

export default async function FeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/dashboard')

  const [feesRes, studentsRes] = await Promise.all([
    supabase
      .from('fees')
      .select('*, student:students(name, class_num)')
      .order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, name, class_num')
      .order('name'),
  ])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email!} role="admin" />
      <FeesClient
        initialFees={feesRes.data ?? []}
        students={studentsRes.data ?? []}
      />
    </div>
  )
}
