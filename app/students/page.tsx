import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import StudentsTable from './StudentsTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentsPage() {
  noStore()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role ?? ''

  if (role === 'student') redirect('/dashboard')

  const { data: students } = await supabase
    .from('students')
    .select(
      'id, name, roll_no, email, stage, class_num, created_at, is_active'
    )
    .eq('is_active', true)
    .order('name')

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Students</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {students?.length ?? 0} enrolled
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <StudentsTable students={students ?? []} />
        </main>
      </div>
    </div>
  )
}