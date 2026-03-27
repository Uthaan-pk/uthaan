import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/dashboard')

  const { data: students } = await supabase
    .from('students')
    .select('id, name, roll_no, email, stage, class_num, created_at')
    .order('name')

  const { data: studentRoles } = await supabase
    .from('user_roles')
    .select('user_id, student_id')
    .eq('role', 'student')

  const { data: parentLinks } = await supabase
    .from('parent_student')
    .select('id, parent_id, student_id')

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 py-4 flex-shrink-0">
          <h1 className="text-lg font-semibold text-[#1a2e1a]">Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage students, teachers, and parent links</p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <AdminClient
            students={students ?? []}
            studentRoles={studentRoles ?? []}
            parentLinks={parentLinks ?? []}
          />
        </main>
      </div>
    </div>
  )
}
