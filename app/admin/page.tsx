import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin') redirect('/dashboard')

  const [studentsRes, parentLinksRes] = await Promise.all([
    supabase.from('students').select('id, name, roll_no, email, class_num, stage').order('name').limit(500),
    supabase.from('parent_student').select('id, parent_id, student_id').limit(500),
  ])

  // Enrich parent links with emails and student names
  const parentIds = (parentLinksRes.data ?? []).map(l => l.parent_id)
  const studentIds = (parentLinksRes.data ?? []).map(l => l.student_id)

  const [parentEmailsRes, linkedStudentsRes] = await Promise.all([
    parentIds.length > 0
      ? supabase.from('user_roles').select('user_id').in('user_id', parentIds)
      : Promise.resolve({ data: [] }),
    studentIds.length > 0
      ? supabase.from('students').select('id, name').in('id', studentIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build enriched links using auth admin to get emails
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const emailMap: Record<string, string> = {}
  authUsers?.forEach(u => { if (u.email) emailMap[u.id] = u.email })

  const studentNameMap: Record<string, string> = {}
  ;(linkedStudentsRes.data ?? []).forEach((s: any) => { studentNameMap[s.id] = s.name })

  const enrichedLinks = (parentLinksRes.data ?? []).map(l => ({
    ...l,
    parent_email: emailMap[l.parent_id] ?? null,
    student_name: studentNameMap[l.student_id] ?? null,
  }))

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Admin Panel</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {studentsRes.data?.length ?? 0} students
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <AdminClient
            students={studentsRes.data ?? []}
            parentLinks={enrichedLinks}
          />
        </main>
      </div>
    </div>
  )
}
