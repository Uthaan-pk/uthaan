import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ResultsPage from './ResultsPage'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  if (role === 'student') redirect('/dashboard')

  const { data: students } = await supabase
    .from('students')
    .select('id, name, roll_no, class_num, stage')
    .order('name', { ascending: true })

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Results &amp; Report Cards</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Academic Year 2025–26
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResultsPage students={students ?? []} />
        </main>
      </div>
    </div>
  )
}
