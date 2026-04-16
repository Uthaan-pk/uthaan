import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import AdminClient from './AdminClient'
import SetupChecklist from '@/components/onboarding/SetupChecklist'

export default async function AdminPage() {
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

  if (roleData?.role !== 'admin') redirect('/dashboard')

  const [studentsRes, parentLinkStudentsRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, roll_no, email, class_num, stage, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(500),

    supabase
      .from('students')
      .select('id, name, roll_no, email, class_num, stage, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(500),
  ])

  if (studentsRes.error) throw studentsRes.error
  if (parentLinkStudentsRes.error) throw parentLinkStudentsRes.error

  const allStudents = studentsRes.data ?? []
  const activeParentLinkStudents = parentLinkStudentsRes.data ?? []

  let enrichedLinks: any[] = []

  if (activeParentLinkStudents.length > 0) {
    const activeStudentIds = activeParentLinkStudents.map(
      (student) => student.id
    )

    const { data: parentLinksData, error: parentLinksError } = await supabase
      .from('parent_student')
      .select(`
        id,
        parent_id,
        parent_email,
        parent_name,
        student_id,
        created_at,
        students!inner (
          id,
          name,
          roll_no,
          class_num,
          stage,
          is_active
        )
      `)
      .in('student_id', activeStudentIds)
      .order('created_at', { ascending: false })
      .limit(500)

    if (parentLinksError) throw parentLinksError

    enrichedLinks = (parentLinksData ?? [])
      .filter((link: any) => link.students && link.students.is_active === true)
      .map((link: any) => ({
        id: link.id,
        parent_id: link.parent_id,
        parent_email: link.parent_email ?? 'Unknown parent',
        parent_name: link.parent_name ?? null,
        student_id: link.student_id,
        student_name: link.students.name,
        student_roll: link.students.roll_no,
      }))
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">
            Student management
          </h1>

          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            {allStudents.length} students
          </span>
        </header>

        <main className="uthaan-page-content">
          <SetupChecklist />

          <AdminClient
            students={allStudents}
            parentLinks={enrichedLinks}
            parentLinkStudents={activeParentLinkStudents}
          />
        </main>
      </div>
    </div>
  )
}
